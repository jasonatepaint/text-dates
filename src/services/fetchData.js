const APP_PREFIX = window.location.hostname === "localhost" ? "" : `/${process.env.REACT_APP_DEPLOY_PATH}`;

const fetchData = (url, httpMethod, data) => {

  let opts = {
    method: httpMethod,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : null
  };

  if (url.startsWith("/api/"))
    url = APP_PREFIX + url;

  return fetch(url, opts)
    .then(r => r.json())
    .then(r => {
      if (r.error) {
        console.error("Epi error:", r);
        throw new Error(r.error, JSON.stringify(r));
      }
      return r;
    });
};

export default fetchData;