const companyFacts = [
  ["Company", "Raysense Global"],
  ["Primary market", "Thailand and Southeast Asia"],
  ["Business vertical", "E-commerce, digital marketing, and social commerce"],
  ["Website", "raysenseglobal.com"],
  ["Contact", "support@raysenseglobal.com"],
];

const services = [
  {
    title: "Social commerce operations",
    body: "We support merchants with campaign planning, creator coordination, product launches, and content-led sales workflows across short-video platforms.",
  },
  {
    title: "Advertising account support",
    body: "Our team helps brands organize TikTok advertising assets, monitor account status, and keep campaign records clear for internal review.",
  },
  {
    title: "CRM and reporting tools",
    body: "We build lightweight tools that help teams manage leads, customer records, advertising accounts, and operational notes in one place.",
  },
];

const apiUses = [
  "Retrieve and organize advertiser, campaign, and account information for authorized business users.",
  "Display campaign performance and account status inside our internal CRM and reporting dashboard.",
  "Improve customer support workflows by matching TikTok business account records with client profiles.",
  "Maintain audit-ready operational records for merchants and advertising service teams.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f7f6] text-[#17201d]">
      <header className="border-b border-[#d7dfdb] bg-[#fbfcfb]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a className="flex items-center gap-3" href="#home" aria-label="Raysense Global home">
            <span className="grid size-10 place-items-center rounded-md bg-[#0d5b4d] text-lg font-semibold text-white">
              R
            </span>
            <span>
              <span className="block text-base font-semibold tracking-normal">
                Raysense Global
              </span>
              <span className="block text-xs font-medium text-[#64736e]">
                Commerce operations and data tools
              </span>
            </span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-[#394843] md:flex">
            <a className="hover:text-[#0d5b4d]" href="#services">
              Services
            </a>
            <a className="hover:text-[#0d5b4d]" href="#api-use">
              TikTok API Use
            </a>
            <a className="hover:text-[#0d5b4d]" href="#company">
              Company
            </a>
            <a className="hover:text-[#0d5b4d]" href="/crm">
              CRM Login
            </a>
            <a className="rounded-md bg-[#0d5b4d] px-4 py-2 text-white hover:bg-[#09483d]" href="mailto:support@raysenseglobal.com">
              Contact
            </a>
          </div>
        </nav>
      </header>

      <section className="border-b border-[#d7dfdb] bg-[#fbfcfb]" id="home">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0d5b4d]">
              Thailand based global commerce support
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[#111815] sm:text-5xl">
              Raysense Global helps commerce teams manage customer growth,
              ad operations, and campaign data.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d5b56]">
              We work with merchants, agencies, and service teams that need a
              clearer way to manage social commerce clients, TikTok advertising
              accounts, and campaign reporting workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="rounded-md bg-[#0d5b4d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#09483d]" href="#api-use">
                View API purpose
              </a>
              <a className="rounded-md border border-[#9db0a9] bg-white px-5 py-3 text-sm font-semibold text-[#24342f] hover:border-[#0d5b4d]" href="#company">
                Company details
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#d7dfdb] bg-white shadow-sm">
            <div className="border-b border-[#e1e7e4] bg-[#edf5f2] px-5 py-4">
              <p className="text-sm font-semibold text-[#0d5b4d]">Operations snapshot</p>
            </div>
            <div className="grid gap-0">
              {companyFacts.map(([label, value]) => (
                <div className="grid gap-1 border-b border-[#edf1ef] px-5 py-4 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-6" key={label}>
                  <dt className="text-sm font-semibold text-[#64736e]">{label}</dt>
                  <dd className="text-sm font-medium text-[#17201d]">{value}</dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14" id="services">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0d5b4d]">
            What we do
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">
            Practical support for digital commerce teams
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {services.map((service) => (
            <article className="rounded-lg border border-[#d7dfdb] bg-white p-6 shadow-sm" key={service.title}>
              <h3 className="text-lg font-semibold">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#52615c]">{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d7dfdb] bg-white" id="api-use">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0d5b4d]">
              TikTok Business API
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              API usage statement
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#52615c]">
              Raysense Global requests TikTok Business API access only for
              authorized business operations, CRM records, advertiser account
              support, and campaign reporting for clients we directly serve.
            </p>
          </div>
          <ul className="grid gap-3">
            {apiUses.map((item) => (
              <li className="rounded-md border border-[#d7dfdb] bg-[#f8faf9] px-5 py-4 text-sm leading-6 text-[#31413c]" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14" id="company">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0d5b4d]">
              Company profile
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              Raysense Global
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#52615c]">
              Raysense Global provides digital commerce operations, customer
              management workflows, and advertising support tools for teams
              working across Thailand and Southeast Asia.
            </p>
          </div>
          <div className="rounded-lg border border-[#d7dfdb] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Official contact</h3>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-[#64736e]">Email</dt>
                <dd className="mt-1">
                  <a className="font-medium text-[#0d5b4d] hover:underline" href="mailto:support@raysenseglobal.com">
                    support@raysenseglobal.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#64736e]">Service region</dt>
                <dd className="mt-1 font-medium">Thailand, Southeast Asia</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#64736e]">Business category</dt>
                <dd className="mt-1 font-medium">E-commerce and digital marketing services</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d7dfdb] bg-[#17201d] px-5 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">Raysense Global</p>
          <p className="text-[#cad6d1]">Official website for company verification and business inquiries.</p>
        </div>
      </footer>
    </main>
  );
}
