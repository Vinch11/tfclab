// A native first-party link, outside the application root. No profile, engine or network call.
(() => {
  const link = document.getElementById('tfcl-det-entry');
  if (!link) return;
  function reflectRoute() {
    link.hidden = location.pathname.replace(/\/$/,'') !== '/planning/ai-plan';
    if (!link.hidden) link.style.cssText = 'display:block;width:fit-content;margin:1rem auto;padding:.5rem 1rem;text-decoration:underline';
    else link.style.removeProperty('display');
  }
  reflectRoute();
  addEventListener('pageshow',reflectRoute);
  addEventListener('popstate',reflectRoute);
  if (window.navigation) window.navigation.addEventListener('navigatesuccess',reflectRoute);
  else document.addEventListener('click',event=>{if(event.target.closest?.('a')) setTimeout(reflectRoute,0);});
})();
