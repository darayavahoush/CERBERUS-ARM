import React, { useEffect, useState } from 'react';

const read = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function Link({ to, children, ...rest }) {
  const here = read() === to;
  return <a href={`#${to}`} aria-current={here ? 'page' : undefined} {...rest}>{children}</a>;
}
