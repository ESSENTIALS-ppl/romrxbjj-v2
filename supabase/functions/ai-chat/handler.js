import"jsr:@supabase/functions-js/edge-runtime.d.ts";import{createClient as N}from"jsr:@supabase/supabase-js@2";const q=Deno.env.get("SUPABASE_URL"),x=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),P=Deno.env.get("romrx_openai_key")??"",Y=Deno.env.get("romrx_anthropic_key")??"";function U(n){try{return JSON.parse(atob(n.split(".")[1]))?.role??"anon"}catch{return"anon"}}const J={hip_er:"hip external rotation",hip_ir:"hip internal rotation",hip_abd:"hip abduction",hip_flex:"hip flexion",shoulder_er:"shoulder external rotation",shoulder_flex:"shoulder flexion",ankle_df:"ankle mobility",lumbar_flex:"lumbar flexion",lumbar_ext:"lumbar extension",thoracic_rot:"thoracic rotation",cervical_rot:"neck rotation"};function R(n){return J[n]??n.replace(/_/g," ")}function D(n,l){const g=l.map(c=>{const o=c.full_name??"Unknown Athlete",m=c.belt??"white",s=c.technique_summary,h=c.worst_joints,a=c.green_techniques,r=c.yellow_techniques,p=c.saved_game_plans,u=(a??[]).reduce((i,e)=>(i[e.category]||(i[e.category]=[]),i[e.category].push(e.name),i),{}),f=Object.entries(u).length>0?Object.entries(u).map(([i,e])=>`    ${i}: ${e.join(", ")}`).join(`
`):"    No assessment yet",d=r&&r.length>0?r.map(i=>{const e=(i.limiting_joints??[]).map(t=>R(t)).join(", ");return`    ${i.name} (${i.category})${e?` - ${e} limiting`:""}`}).join(`
`):"    No assessment yet",w=p&&p.length>0?p.map(i=>`    "${i.name}" (${i.path_mode})`).join(`
`):"    None saved yet";return`### ${o} (${m} belt)
  Readiness: ${s?`${s.green??0} GREEN / ${s.yellow??0} YELLOW / ${s.red??0} RED`:"No assessment"}
  Priority joints: ${h?.map(i=>R(i)).join(", ")??"No data"}
  GREEN techniques (ready to train):
${f}
  YELLOW techniques (train with awareness):
${d}
  Saved game plans:
${w}`});return`You are ROMBot, the team intelligence assistant for ROMRxBJJ coach ${n}.

You have full access to ALL of your athletes' ROM profiles, technique readiness, and saved game plans. Use this data to answer coaching questions with specificity.

## Your Roster (${l.length} athlete${l.length!==1?"s":""})

${g.join(`

`)}

## Your Role as Coach ROMBot
- Answer questions about individual athletes or the whole team by name
- Identify who is most at risk, who is ready to train hard, who needs modified work
- Suggest technique readiness comparisons across the roster
- Help build game plans for specific athletes based on their GREEN/YELLOW profile
- Suggest drill assignments and mobility priorities per athlete
- Reference saved game plans by name

## Critical Rules
- NEVER reveal specific degree values or ROM thresholds - these are proprietary
- NEVER use technique codes (e.g. WT-1) - use technique names only
- Reference joint restrictions with soft language: "hip IR is restricted", "shoulder flexion is limited"
- Use technique names from each athlete's GREEN/YELLOW lists when making recommendations
- Be direct and coaching-focused. You are talking to a professional.

Keep responses concise and actionable. Use bullet points. Always tie advice to actual athlete data.`}function C(n,l){const g=n.full_name??"Athlete",c=n.belt??"white",o=n.technique_summary,m=n.protocol,s=n.red_techniques,h=n.worst_joints,a=n.green_techniques,r=n.yellow_techniques,p=n.saved_game_plans,u=(a??[]).reduce((e,t)=>(e[t.category]||(e[t.category]=[]),e[t.category].push(t.name),e),{}),f=Object.entries(u).length>0?Object.entries(u).map(([e,t])=>`  ${e}: ${t.join(", ")}`).join(`
`):"  No assessment completed yet",d=r&&r.length>0?r.map(e=>{const t=(e.limiting_joints??[]).map(b=>R(b)).join(", ");return`  ${e.name} (${e.category})${t?` - ${t} limiting`:""}`}).join(`
`):"  No assessment completed yet",w=s&&s.length>0?s.slice(0,8).map(e=>{const t=e,b=(t.limiting_joints??[]).map(E=>R(E)).join(", ");return`  ${t.name} (${t.belt} belt) - ${b} limiting`}).join(`
`):"  None yet",i=p&&p.length>0?p.map(e=>{const t=(e.techniques??[]).map(b=>b.name).join(" > ");return`  "${e.name}" (${e.path_mode}): ${t}`}).join(`
`):"  No saved game plans yet";return`You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Athlete Profile
Name: ${g} | Belt: ${c} belt | Sport: ${l.toUpperCase()}
Technique readiness: ${o?`${o.green??0} GREEN, ${o.yellow??0} YELLOW, ${o.red??0} RED`:"No assessment yet"}
Priority joints to improve: ${h?.map(e=>R(e)).join(", ")??"No assessment yet"}

## GREEN techniques - ready to train now
${f}

## YELLOW techniques - train with awareness
${d}

## RED techniques - build mobility before attempting
${w}

## Priority mobility protocol
${m?.slice(0,3).map(e=>{const t=e;return`  ${t.joint??t.jointKey}: ${t.exercise} - ${t.sets}x${t.reps} (${t.cue??t.coaching_cue})`}).join(`
`)??"  No protocol generated yet"}

## Saved Game Plans
${i}

## Critical Rules
- NEVER reveal specific degree values or ROM thresholds
- NEVER use technique codes - use technique names only
- Reference restrictions with soft language: "hip IR is restricted"
- If asked for numbers say: "I can't share exact measurements, but I can tell you how your mobility compares to what each technique needs"

Keep responses focused. Use bullet points. Tie advice to this athlete's GREEN/YELLOW/RED profile.`}async function M(n,l){try{return(await(await fetch("https://api.openai.com/v1/embeddings",{method:"POST",headers:{Authorization:`Bearer ${l}`,"Content-Type":"application/json"},body:JSON.stringify({model:"text-embedding-ada-002",input:n.slice(0,1e3)})})).json()).data?.[0]?.embedding??null}catch{return null}}async function G(n,l,g,c,o,m){const s=Date.now(),h=[...o.map(a=>({role:a.role,content:a.content})),{role:"user",content:m}];if(n==="rombot"||n==="openai"){const a=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${g||P}`,"Content-Type":"application/json"},body:JSON.stringify({model:l??"gpt-4o",messages:[{role:"system",content:c},...h],max_tokens:1200,temperature:.5})}),r=await a.json();if(!a.ok)throw new Error(r.error?.message??"OpenAI error");return{text:r.choices[0].message.content,tokens:r.usage?.total_tokens??0,latency:Date.now()-s}}if(n==="anthropic"){const a=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":g||Y,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model:l??"claude-opus-4-5",system:c,messages:h,max_tokens:1200})}),r=await a.json();if(!a.ok)throw new Error(r.error?.message??"Anthropic error");return{text:r.content[0].text,tokens:(r.usage?.input_tokens??0)+(r.usage?.output_tokens??0),latency:Date.now()-s}}throw new Error(`Unknown provider: ${n}`)}async function V(n){if(n.method==="OPTIONS")return new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});try{const l=n.headers.get("Authorization")??"",g=l.replace("Bearer ","").trim(),c=U(g),o=await n.json();let m=o.sport??"bjj";const s=N(q,x);let h="",a="rombot",r,p="",u=o.conversation_id,f=!1,d;if(c==="authenticated"){const y=N(q,x,{global:{headers:{Authorization:l}}}),{data:{user:_},error:L}=await y.auth.getUser();if(L||!_)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});d=_.id,f=!0;const{data:$}=await s.from("user_ai_preferences").select("provider, model, api_key_enc").eq("user_id",d).maybeSingle();$&&(a=$.provider,r=$.model??void 0,p=$.api_key_enc??"");const{data:v}=await s.from("users").select("portal_role, full_name, active_sport").eq("id",d).maybeSingle(),T=v?.portal_role;if(m=v?.active_sport??m,T==="coach"){const j=v?.full_name??"Coach",{data:A}=await s.from("coaches").select("id").eq("user_id",d).maybeSingle();let O=[];if(A){const{data:S}=await s.from("athletes").select("user_id").eq("coach_id",A.id).eq("is_active",!0);if(S&&S.length>0){const B=S.map(k=>k.user_id).filter(Boolean).map(k=>s.from("rombot_context").select("*").eq("user_id",k).maybeSingle().then(({data:I})=>I));O=(await Promise.all(B)).filter(Boolean)}}h=D(j,O)}else{const{data:j}=await s.from("rombot_context").select("*").eq("user_id",d).maybeSingle();h=C(j??{},m)}}else{if(!o.user_email)return new Response(JSON.stringify({error:"user_email required for guest mode"}),{status:400});const y=o.guest_context??{};a=o.provider??"rombot",p=o.provider_key??"",h=C(y,m)}let w=[];if(f&&u){const{data:y}=await s.from("ai_messages").select("role, content").eq("conversation_id",u).order("created_at",{ascending:!0}).limit(20);w=y??[]}else o.history&&(w=o.history.slice(-10));if(f&&!u&&d){const{data:y,error:_}=await s.from("ai_conversations").insert({user_id:d,sport:m,provider:a,model:r??null,context_snapshot:{}}).select("id").single();if(_)throw _;u=y.id}const i=await M(o.message,P);let e="";if(i){const{data:y}=await s.rpc("search_rombot_knowledge",{query_embedding:i,p_sport:m,match_threshold:.7,match_count:4});y&&y.length>0&&(e=`

## Relevant Research
`+y.map(_=>`${_.topic}: ${_.chunk} (${_.source_citation})`).join(`
`))}const{text:t,tokens:b,latency:E}=await G(a,r,p,h+e,w,o.message);return f&&u&&d&&(await s.from("ai_messages").insert([{conversation_id:u,user_id:d,role:"user",content:o.message},{conversation_id:u,user_id:d,role:"assistant",content:t,tokens_used:b,latency_ms:E}]),o.conversation_id||await s.from("ai_conversations").update({title:o.message.slice(0,60)}).eq("id",u)),new Response(JSON.stringify({reply:t,conversation_id:u??null,provider:a,sport:m}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}})}catch(l){const g=l instanceof Error?l.message:"Unknown error";return new Response(JSON.stringify({error:g}),{status:500,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}})}}export{V as handleRequest};
