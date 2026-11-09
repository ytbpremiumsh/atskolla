import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PaketSekolah from './PaketSekolah';

vi.mock('@/hooks/usePackageStatus', () => ({ usePackageStatus: () => ({loading:false, packageType:'payment', packageStatus:'active', gracePeriodDays:60,lastPaymentActivityAt:'2026-10-10T05:00:00Z'}) }));
vi.mock('@/components/PageHeader', () => ({ PageHeader: ({title}:{title:string}) => <h1>{title}</h1> }));
afterEach(() => {cleanup();vi.useRealTimers();});

describe('free school package', () => {
 it('shows only the free service and the continuing SPP payment requirement', () => {
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-09T05:00:00Z'));
  render(<PaketSekolah/>);
  expect(screen.getByRole('heading',{name:'ATSkolla Gratis'})).toBeInTheDocument();
  expect(screen.queryByText(/Mandiri/)).not.toBeInTheDocument();
  expect(screen.getByText('60 hari')).toBeInTheDocument();
  expect(screen.getByText('SPP Online wajib tetap aktif')).toBeInTheDocument();
  expect(screen.getByText('Aktivitas pembayaran terakhir: 30 hari lalu.')).toBeInTheDocument();
  expect(screen.getByText(/tidak mengulang masa toleransi/)).toBeInTheDocument();
 });
});
