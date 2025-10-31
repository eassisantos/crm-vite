import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

export interface BreadcrumbConfig {
  label: string;
  parent?: string;
}

export interface BreadcrumbSegment {
  label: string;
  path: string;
  isCurrent: boolean;
}

export const breadcrumbMap: Record<string, BreadcrumbConfig> = {
  '/': { label: 'Dashboard' },
  '/casos': { label: 'Casos', parent: '/' },
  '/casos/:caseId': { label: 'Detalhes do Caso', parent: '/casos' },
  '/clientes': { label: 'Clientes', parent: '/' },
  '/clientes/:clientId': { label: 'Detalhes do Cliente', parent: '/clientes' },
  '/agenda': { label: 'Agenda', parent: '/' },
  '/financeiro': { label: 'Financeiro', parent: '/' },
  '/modelos': { label: 'Modelos', parent: '/' },
  '/configuracoes': { label: 'Configurações', parent: '/' },
};

type DynamicLabelResolver = (pattern: string, params: Record<string, string>) => string | undefined;

export const useBreadcrumbs = (getDynamicLabel?: DynamicLabelResolver): BreadcrumbSegment[] => {
  const location = useLocation();

  return useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const accumulatedPaths: string[] = [];

    pathParts.forEach((part, index) => {
      const previous = accumulatedPaths[index - 1] ?? '';
      const rawPath = `${previous}/${part}`;
      const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      accumulatedPaths.push(normalized || '/');
    });

    if (accumulatedPaths.length === 0) {
      accumulatedPaths.push('/');
    } else if (!accumulatedPaths.includes('/')) {
      accumulatedPaths.unshift('/');
    }

    const segments = accumulatedPaths
      .map(path => {
        const matchEntry = Object.entries(breadcrumbMap).find(([pattern]) =>
          matchPath({ path: pattern, end: true }, path),
        );

        if (!matchEntry) {
          return undefined;
        }

        const [pattern, config] = matchEntry;
        const match = matchPath({ path: pattern, end: true }, path);
        if (!match) {
          return undefined;
        }

        const label = getDynamicLabel?.(pattern, match.params ?? {}) ?? config.label;
        return { label, path, isCurrent: false } as BreadcrumbSegment;
      })
      .filter((segment): segment is BreadcrumbSegment => Boolean(segment));

    const deduped = segments.filter(
      (segment, index, self) => self.findIndex(item => item.path === segment.path) === index,
    );

    return deduped.map(segment => ({
      ...segment,
      isCurrent: segment.path === location.pathname,
    }));
  }, [getDynamicLabel, location.pathname]);
};

