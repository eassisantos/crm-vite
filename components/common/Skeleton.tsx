import React from 'react';

type SkeletonProps = {
  className?: string;
};

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/60 ${className}`.trim()}
    aria-hidden="true"
  />
);

export default Skeleton;
