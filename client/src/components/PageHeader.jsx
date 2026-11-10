import { useContext, useLayoutEffect } from 'react';
import { PageChromeContext } from '../contexts/PageChromeContext';

export default function PageHeader({ title, backTo, backLabel = 'Quay lại', fill = false }) {
  const setPageChrome = useContext(PageChromeContext);

  useLayoutEffect(() => {
    if (!setPageChrome) return undefined;
    setPageChrome({ title, backTo, backLabel, fill });
    return () => setPageChrome(null);
  }, [setPageChrome, title, backTo, backLabel, fill]);

  return null;
}
