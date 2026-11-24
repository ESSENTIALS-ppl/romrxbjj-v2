// ROMood tips for ROMBot, one per notch (1 to 10). FINAL COPY, loaded verbatim Oct 28 2026 from
//   /workspace/beta-launch/romood-rombot/ROMBOT-MOOD-TIPS-FINAL-20261028.md
// (only the text between the BEGIN USER-FACING and END USER-FACING markers). Not ship approval; Stacy still signs off.
// To change a tip, edit the `text` or `url` of its row. Nothing else in the code needs to change.
//
// Rules the code follows (Stacy): a tip is shown ONLY when the user asks for one (never inside a mood answer),
// never says or implies it was picked for a low mood, never shows or names a notch, shows the DOI link only (no paper
// titles, grades or effect sizes), and always carries the footer below.

/** Master switch for showing tips at all. */
export const ROMOOD_TIPS_ENABLED = true;

/** Exact footer, shown under every tip. */
export const ROMOOD_TIP_FOOTER = "General wellness tips, not medical or mental health advice.";

export const ROMOOD_TIPS_STATUS = "final_copy_loaded";

export const ROMOOD_TIPS = [
  { notch: 1, status: "final", text: "Breathe slowly for five minutes. Sit down. Breathe in through your nose, add one small extra sniff in at the top, then let a long, slow breath out through your mouth. Repeat. Make the breath out longer than the breath in. Stop if you feel dizzy.",
    url: "https://doi.org/10.1016/j.xcrm.2022.100895" },
  { notch: 2, status: "final", text: "Step outside for a few minutes. If you can, find some trees, grass, or water. Look around and let your eyes rest on it.",
    url: "https://doi.org/10.1080/17439760.2014.994224" },
  { notch: 3, status: "final", text: "Go for an easy walk of 10 to 15 minutes. Go slowly enough that you could chat. Easy is enough.",
    url: "https://doi.org/10.1016/j.psychsport.2005.11.003" },
  { notch: 4, status: "final", text: "Put on 10 minutes of music you picked yourself, a song or two you like. Just listen. No chores at the same time.",
    url: "https://doi.org/10.1371/journal.pone.0218017" },
  { notch: 5, status: "final", text: "Pick one small thing you usually enjoy or care about, and do it today for 10 minutes. A hobby, a hot drink on the porch, a short call, a few pages of a book. Small is fine.",
    url: "https://doi.org/10.1080/17439760903569154" },
  { notch: 6, status: "final", text: "Write down three things that went well today, or this week, and one line about why each happened. Small things count.",
    url: "https://doi.org/10.1037/cou0000107" },
  { notch: 7, status: "final", text: "Do one kind thing for someone today. Send a thank-you note, pay a real compliment, or help with a small job. It does not have to be big.",
    url: "https://doi.org/10.1016/j.jesp.2018.02.014" },
  { notch: 8, status: "final", text: "Start a short, friendly chat with someone near you. A neighbor, a cashier, a teammate, someone on the bus. A few minutes is enough. Many people find it feels better than they expect.",
    url: "https://doi.org/10.1037/a0037323" },
  { notch: 9, status: "final", text: "Tell someone about something good that happened to you, big or small. Say what it was and how it felt. Pick someone who will be glad to hear it.",
    url: "https://doi.org/10.1037/0022-3514.87.2.228" },
  { notch: 10, status: "final", text: "Take a 15 minute walk and look for something that fills you with wonder: a big sky, a tall tree, a far view, a tiny detail up close. Stop and take it in for a minute.",
    url: "https://doi.org/10.1037/emo0000876" },
];
