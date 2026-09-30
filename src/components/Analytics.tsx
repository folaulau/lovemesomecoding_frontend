/**
 * Google Analytics 4. Rendered from the root layout, so it is in every exported page —
 * including admin.html, which is why the guards run in the browser rather than here.
 *
 * Page views after the first come from GA's Enhanced measurement ("page changes based on
 * browser history events"), which picks up Next's client-side <Link> navigations. Keep that
 * setting on in the GA web stream or only landing pages get counted.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

// Interpolated into an inline script, so accept only the documented id shape.
const enabled = process.env.NEXT_PUBLIC_ENV === 'prod' && /^G-[A-Z0-9]+$/.test(GA_ID);

// Bails out before Google's script is requested:
//  - on /admin, which shares this layout but must never be tracked;
//  - off the real hostname, so `npm run preview` on :4321 (a prod build) sends nothing.
// The regex keeps a future post like /administration-guide tracked.
const GA_BOOTSTRAP = `
(function(){
  if(/^\\/admin(\\/|$)/.test(location.pathname))return;
  if(!/(^|\\.)lovemesomecoding\\.com$/.test(location.hostname))return;
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('js',new Date());
  gtag('config','${GA_ID}');
  var s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
  document.head.appendChild(s);
})();
`;

export default function Analytics() {
  if (!enabled) return null;
  return <script data-ga={GA_ID} dangerouslySetInnerHTML={{ __html: GA_BOOTSTRAP }} />;
}
