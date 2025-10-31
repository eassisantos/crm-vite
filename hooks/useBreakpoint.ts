import { useEffect, useState } from 'react';

type Direction = 'min' | 'max';

const createQuery = (breakpoint: number, direction: Direction) =>
  direction === 'min' ? `(min-width: ${breakpoint}px)` : `(max-width: ${breakpoint - 0.02}px)`;

const getMatch = (breakpoint: number, direction: Direction) => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(createQuery(breakpoint, direction)).matches;
};

const useBreakpoint = (breakpoint: number, direction: Direction = 'max') => {
  const [matches, setMatches] = useState(() => getMatch(breakpoint, direction));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(createQuery(breakpoint, direction));

    const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => {
      setMatches(event.matches);
    };

    updateMatch(mediaQuery);

    const listener = (event: MediaQueryListEvent) => updateMatch(event);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [breakpoint, direction]);

  return matches;
};

export default useBreakpoint;
