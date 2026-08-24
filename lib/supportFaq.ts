import type { FaqItem } from "@/lib/automotiveFaq";

/**
 * Support FAQ for /contact.
 *
 * Deliberately OPERATIONAL — the questions someone already using the product
 * arrives with (access, plan limits, missing charts, invoices, requesting a
 * market). That is a different audience from the informational FAQ on
 * /automotive-market-intelligence, which targets people who have not found us
 * yet, so the two sets do not compete for the same query.
 *
 * Every answer describes behaviour verified in the app. No response-time SLA is
 * promised anywhere here, because none is defined in the product.
 */
export const SUPPORT_FAQS: FaqItem[] = [
  {
    q: "I have subscribed but still cannot see the full data. What should I check?",
    a: "Access is applied to your signed-in account, so first confirm you are logged in with the same email used at checkout. Entitlement refreshes on its own shortly after payment — reloading the page or switching back to the tab will pick it up. If the data is still locked after that, send us the payment reference and we will check the subscription record directly.",
    links: [{ match: "payment reference", href: "/subscription" }],
  },
  {
    q: "Why can I only select some countries?",
    a: "Plans include a set number of country slots — the entry plan covers one market, higher tiers cover more. The country selector only offers the markets your plan includes, plus those we publish for that segment. If you need a different market, you can change plan or ask us about a custom combination.",
    links: [{ match: "change plan", href: "/pricing" }],
  },
  {
    q: "A chart or section is missing for my country. Is something broken?",
    a: "Almost always no. Coverage varies by market, segment and month, and a section is hidden when there is no published data for what you selected rather than showing an older month's figures under the current label. An empty section means that data has not been released yet — not that sales were zero.",
    links: [
      { match: "Coverage varies", href: "/flash-reports/country-data" },
    ],
  },
  {
    q: "The latest report shows last month. Is that correct?",
    a: "Yes. A month can only be reported once it has ended and its figures have been collected and checked, so a June report is published in July. This publication lag applies to official vehicle sales and registration reporting in every market we cover.",
  },
  {
    q: "The numbers changed from what I saw last month. Why?",
    a: "Figures can be restated as official sources finalise their data, which is normal for vehicle registration reporting. If you are citing a figure externally, quote the report month alongside it so the reference stays unambiguous. Our sourcing and definitions are set out on the methodology page.",
    links: [{ match: "methodology page", href: "/methodology" }],
  },
  {
    q: "How do I reset my password?",
    a: "Use the password reset option from the login screen and follow the emailed link. If the email does not arrive, check spam and confirm you are using the address the account was registered with — then contact us and we will help you recover access.",
  },
  {
    q: "Where do I find my invoice or payment receipt?",
    a: "A receipt is generated for each successful payment and is available from your subscription area once the payment is confirmed. Prices are inclusive of applicable GST, so the amount charged is the amount shown at checkout. If you need the invoice reissued or addressed to a company entity, contact us with the payment reference.",
    links: [{ match: "subscription area", href: "/subscription" }],
  },
  {
    q: "Can you add a country or segment that is not covered yet?",
    a: "Often yes — coverage expands based on what subscribers ask for. Tell us the market and segments you need and how you intend to use them, and we will confirm whether it is already planned and what the timeline looks like.",
  },
  {
    q: "Can I speak to an analyst before subscribing?",
    a: "Yes. Use the Talk to an Expert option available across the site to request a call, or send an enquiry from this page. It is worth doing if you want to confirm that a specific market, segment or forecast method fits your use case before committing.",
  },
  {
    q: "Do you offer custom or enterprise plans?",
    a: "Yes. Beyond the standard tiers we arrange custom seat counts, multi-team access, tailored regional combinations and enterprise onboarding. Contact us with your requirement and we will put together an appropriate arrangement.",
    links: [{ match: "standard tiers", href: "/pricing" }],
  },
];
