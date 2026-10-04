'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulation } from '@/store/useSimulation';

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Overview' },
  { href: '/network', label: 'P2P Network' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/vpp', label: 'VPP Dispatch' },
  { href: '/occupant', label: 'Occupant & IAQ' },
  { href: '/buildings/nova', label: 'Buildings (Nova)' },
  { href: '/buildings/orbit', label: 'Buildings (Orbit)' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/submission', label: 'Submission Claims' },
  { href: '/simulator', label: 'Simulator & Autopilot' },
  { href: '/roi', label: 'ROI Calculator' },
  { href: '/demo', label: 'Guided Demo' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/profile', label: 'Operator Profile' },
];

export function Sidebar() {
  const pathname = usePathname();
  const runs = useSimulation();
  const activeRun = runs.network_dr ?? runs.network;
  const numBuildings = Object.keys(activeRun.buildings).length;

  return (
    <aside className="fixed left-0 top-28 bottom-0 w-64 bg-surface-container-low z-40 flex flex-col py-space-base shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-r border-surface-container-high/60 overflow-y-auto">
      <div className="px-space-lg mb-space-base">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">
          Operational Modules
        </span>
      </div>

      <nav className="flex-1 px-space-sm flex flex-col gap-space-2xs">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href.startsWith('/buildings') && pathname.startsWith('/buildings') && pathname === item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-space-md py-space-sm rounded-lg transition-colors font-body-md text-body-md ${
                isActive
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-space-md pt-space-base bg-surface-container-lowest mx-space-sm p-space-sm rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-surface-container-high/50 mt-space-base">
        <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-space-2xs">
          Dispatch Telemetry
        </div>
        <div className="flex items-center justify-between font-telemetry-sm text-telemetry-sm">
          <span className="text-on-surface-variant">Active Nodes</span>
          <span className="font-bold text-on-surface">{numBuildings} / 6</span>
        </div>
        <div className="flex items-center justify-between font-telemetry-sm text-telemetry-sm mt-space-2xs">
          <span className="text-on-surface-variant">Virtual Capacity</span>
          <span className="font-bold text-secondary">2.4 MW</span>
        </div>
      </div>
    </aside>
  );
}
