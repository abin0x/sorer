import React from 'react';
import { useLocation } from 'react-router-dom';
import { moduleForRoute } from '@/lib/moduleRoutes';
import ModuleGate from '@/components/modules/ModuleGate';

export default function TenantRouteGate({ children }) {
  const { pathname } = useLocation();
  const key = moduleForRoute(pathname);
  return key ? <ModuleGate moduleKey={key}>{children}</ModuleGate> : children;
}