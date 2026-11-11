type BuildingCardDefinition = {
  id: string;
  document: string;
};

const footerMarkup = `
  <div class="_0b3d52" style="--padding:0;">
    <footer class="_5b8182">
      <div><p data-gc-content="mainSite.shared.footer.copyright"></p></div>
      <div><p data-gc-content="mainSite.shared.footer.tagline"></p></div>
      <div>
        <p>
          <a href="#" data-gc-card-target="/transparenta/" data-gc-content="mainSite.shared.footer.transparency"></a>
        </p>
      </div>
    </footer>
  </div>`;

const cardDocument = (panel: string) => `<main>${panel}</main>`;

const standardCard = ({
  id,
  pagePath,
  paragraphs,
  titleInSpan = false,
  listItems = [],
}: {
  id: string;
  pagePath: string;
  paragraphs: string[];
  titleInSpan?: boolean;
  listItems?: string[];
}): BuildingCardDefinition => {
  const title = titleInSpan
    ? `<h1><span class="_b6af36" data-gc-content="${pagePath}.title"></span></h1>`
    : `<h1 data-gc-content="${pagePath}.title"></h1>`;
  const body = paragraphs
    .map((key) => `<p data-gc-content="${pagePath}.${key}"></p>`)
    .join('');
  const list = listItems.length
    ? `<ul>${listItems
        .map((key) => `<li data-gc-content="${pagePath}.${key}"></li>`)
        .join('')}</ul>`
    : '';

  return {
    id,
    document: cardDocument(`
      <div class="_190b32 _79c599 _b977da _1be840" style="--start:1; --end:0;">
        <div class="_18d1bd">
          <div class="_9622f0">
            <div class="_c1b0c0">
              <div class="_f72612">
                <div class="_fa5c11">
                  <div class="_9d6b51">${title}${body}${list}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`),
  };
};

const impactCard: BuildingCardDefinition = {
  id: '/impact/',
  document: cardDocument(`
    <div class="_190b32 _889852 _1be840" style="--start:1; --end:3;">
      <div class="_18d1bd">
        <div class="_9622f0">
          <div class="_c1b0c0">
            <div class="_2d7757">
              <div class="_ab40f5 impact-facts-grid">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (index) => `
                      <div class="_187561${index % 2 === 0 ? ' _0dfbe7' : ''}">
                        <h3 class="_d010ea" data-gc-content="mainSite.pages.impact.fact${index}Number"></h3>
                        <div data-gc-content="mainSite.pages.impact.fact${index}Text"></div>
                      </div>`,
                  )
                  .join('')}
              </div>
            </div>
            <div class="_f72612">
              <div class="_fa5c11">
                <div class="_9d6b51">
                  <h2 data-gc-content="mainSite.pages.impact.title"></h2>
                  <p data-gc-content="mainSite.pages.impact.paragraph1"></p>
                  <p data-gc-content="mainSite.pages.impact.paragraph2"></p>
                </div>
              </div>
              <div class="_e81189">
                <a
                  href="/brandbook-section/?entry=standalone"
                  data-pass="true"
                  data-gc-explore-link
                  class="_ab4318"
                >
                  <span data-gc-content="mainSite.pages.impact.workCta"></span>
                  <svg class="_806e1d" viewBox="0 0 101 101" xmlns="http://www.w3.org/2000/svg">
                    <path vector-effect="non-scaling-stroke" d="M2.5 50.5C2.50001 23.9903 23.9903 2.50001 50.5 2.50001C77.0097 2.50001 98.5 23.9903 98.5 50.5C98.5 77.0097 77.0097 98.5 50.5 98.5C23.9903 98.5 2.5 77.0097 2.5 50.5Z"/>
                    <path d="M50.5 16.55V84.45" vector-effect="non-scaling-stroke"/>
                    <path d="M84.4502 50.5L16.5502 50.5" vector-effect="non-scaling-stroke"/>
                  </svg>
                </a>
                <a href="#" data-gc-card-target="/procesul-proiectului/" class="_ab4318">
                  <span data-gc-content="mainSite.pages.impact.projectsCta"></span>
                  <svg class="_806e1d" viewBox="0 0 101 101" xmlns="http://www.w3.org/2000/svg">
                    <path vector-effect="non-scaling-stroke" d="M2.5 50.5C2.50001 23.9903 23.9903 2.50001 50.5 2.50001C77.0097 2.50001 98.5 23.9903 98.5 50.5C98.5 77.0097 77.0097 98.5 50.5 98.5C23.9903 98.5 2.5 77.0097 2.5 50.5Z"/>
                    <path d="M50.5 16.55V84.45" vector-effect="non-scaling-stroke"/>
                    <path d="M84.4502 50.5L16.5502 50.5" vector-effect="non-scaling-stroke"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          ${footerMarkup}
        </div>
      </div>
    </div>`),
};

const processSteps = Array.from({length: 17}, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return `
    <div class="_2adfe9${number === '08' ? ' _3539ec' : ''}">
      <h3 data-gc-content="mainSite.pages.process.steps.step${number}Number"></h3>
      <div data-gc-content="mainSite.pages.process.steps.step${number}Text"></div>
    </div>`;
}).join('');

const processCard: BuildingCardDefinition = {
  id: '/procesul-proiectului/',
  document: cardDocument(`
    <div class="_190b32 _eb71cf _1be840" style="--start:2; --end:2;">
      <div class="_18d1bd">
        <div class="_9622f0">
          <div class="_c1b0c0">
            <div class="_2d7757">
              <div class="_fce1e2">
                <div class="_bedaeb"><div class="_d43144">${processSteps}</div></div>
              </div>
            </div>
            <div class="_f72612">
              <div class="_4810c0">
                <article class="_83367b">
                  <div class="_241a3d" data-gc-content="mainSite.pages.process.methodKicker"></div>
                  <h3 class="_e8f1cd" data-gc-content="mainSite.pages.process.methodTitle"></h3>
                  <div class="_9d6b51"><p data-gc-content-html="mainSite.pages.process.methodBodyHtml"></p></div>
                </article>
                <article class="_83367b">
                  <div class="_241a3d" data-gc-content="mainSite.pages.process.networkKicker"></div>
                  <h3 class="_e8f1cd" data-gc-content="mainSite.pages.process.networkTitle"></h3>
                  <div class="_9d6b51"><p data-gc-content-html="mainSite.pages.process.networkBodyHtml"></p></div>
                </article>
              </div>
            </div>
          </div>
          ${footerMarkup}
        </div>
      </div>
    </div>`),
};

const transparencyCard: BuildingCardDefinition = {
  id: '/transparenta/',
  document: cardDocument(`
    <div class="_190b32 _79c599 _b977da _1be840" style="--start:1; --end:0;">
      <div class="_18d1bd">
        <div class="_9622f0">
          <div class="_c1b0c0">
            <div class="_f72612">
              <div class="_fa5c11">
                <div class="_9d6b51">
                  <h1 data-gc-content="mainSite.pages.transparency.title"></h1>
                  ${['resources', 'publishing', 'selection', 'privacy', 'contact']
                    .map(
                      (section) => `
                        <h2 data-gc-content="mainSite.pages.transparency.${section}Title"></h2>
                        <p data-gc-content="mainSite.pages.transparency.${section}Text"></p>`,
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
          ${footerMarkup}
        </div>
      </div>
    </div>`),
};

const contactCard: BuildingCardDefinition = {
  id: '/contact/',
  document: `<main data-gc-legacy-contact>
    <div class="_190b32 _889852 _1be840" style="--start:3; --end:1;">
      <div class="_18d1bd">
        <div class="_9622f0">
          <div class="_c1b0c0 gc-legacy-contact__page">
            <section class="_9d6b51 gc-legacy-contact__intro" aria-labelledby="gc-legacy-contact-title">
              <span class="gc-legacy-contact__kicker" data-gc-content="mainSite.pages.contact.kicker"></span>
              <h1 id="gc-legacy-contact-title" data-gc-content="mainSite.pages.contact.title"></h1>
              <p data-gc-content="mainSite.pages.contact.intro"></p>
              <p data-gc-content="mainSite.pages.contact.note"></p>
            </section>
            <address class="gc-legacy-contact__list" aria-label="" data-gc-content-aria="mainSite.pages.contact.detailsAria">
              <div class="gc-legacy-contact__row">
                <span data-gc-content="mainSite.pages.contact.addressLabel"></span>
                <strong data-gc-content-html="mainSite.pages.contact.addressHtml"></strong>
              </div>
              <div class="gc-legacy-contact__row">
                <span data-gc-content="mainSite.pages.contact.emailLabel"></span>
                <a href="" data-gc-content="mainSite.pages.contact.email" data-gc-content-email-href="mainSite.pages.contact.email"></a>
              </div>
              <div class="gc-legacy-contact__row">
                <span data-gc-content="mainSite.pages.contact.websiteLabel"></span>
                <a href="https://greentechcharity.ro/" target="_blank" rel="noreferrer" data-pass="true" data-gc-content="mainSite.pages.contact.website"></a>
              </div>
            </address>
          </div>
          ${footerMarkup}
        </div>
      </div>
    </div>
  </main>`,
};

export const BUILDING_CARDS: readonly BuildingCardDefinition[] = [
  {
    id: '/',
    document: `<main>
      <div class="_190b32" style="--start:1; --end:0;">
        <div class="_18d1bd">
          <div class="_9622f0">
            <div class="_c1b0c0"></div>
            <div class="_0b3d52" style="--padding:2;">
              <footer class="_5b8182">
                <div><p data-gc-content="mainSite.shared.footer.copyright"></p></div>
                <div><p data-gc-content="mainSite.shared.footer.tagline"></p></div>
                <div>
                  <p>
                    <a href="#" data-gc-card-target="/transparenta/" data-gc-content="mainSite.shared.footer.transparency"></a>
                  </p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </main>`,
  },
  standardCard({
    id: '/confort-si-siguranta/',
    pagePath: 'mainSite.pages.comfortSafety',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
  }),
  standardCard({
    id: '/sprijin-pentru-familii/',
    pagePath: 'mainSite.pages.familySupport',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
  }),
  standardCard({
    id: '/un-camin-sanatos/',
    pagePath: 'mainSite.pages.healthyHome',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
  }),
  standardCard({
    id: '/povestea-proiectului/',
    pagePath: 'mainSite.pages.story',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
  }),
  standardCard({
    id: '/spatii-verzi/',
    pagePath: 'mainSite.pages.greenSpaces',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
    titleInSpan: true,
  }),
  standardCard({
    id: '/voluntariat/',
    pagePath: 'mainSite.pages.volunteer',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
  }),
  standardCard({
    id: '/casa-sustenabila/',
    pagePath: 'mainSite.pages.sustainableHome',
    paragraphs: ['intro', 'principlesIntro'],
    titleInSpan: true,
    listItems: ['principle1', 'principle2', 'principle3'],
  }),
  standardCard({
    id: '/doneaza/',
    pagePath: 'mainSite.pages.donate',
    paragraphs: ['paragraph1', 'paragraph2', 'paragraph3'],
    titleInSpan: true,
  }),
  transparencyCard,
  impactCard,
  processCard,
  contactCard,
];

export const BUILDING_CARD_IDS = new Set(BUILDING_CARDS.map((card) => card.id));

export const BuildingCardRegistry = () => (
  <div hidden aria-hidden="true" data-gc-card-registry>
    {BUILDING_CARDS.map((card) => (
      <template
        key={card.id}
        data-gc-card-id={card.id}
        dangerouslySetInnerHTML={{__html: card.document}}
      />
    ))}
  </div>
);
