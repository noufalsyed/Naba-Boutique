import { Badge, type Tone } from '@/components/admin/ui';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, STITCHING_STATUS_LABEL, type OrderStatusKey } from '@/lib/constants';
import { STOCK_STATUS_LABEL, type StockStatus } from '@/lib/pricing';

const ORDER_TONE: Record<OrderStatusKey, Tone> = {
  PENDING: 'amber',
  PAYMENT_PENDING: 'amber',
  PAID: 'blue',
  CONFIRMED: 'blue',
  PROCESSING: 'blue',
  READY_TO_SHIP: 'wine',
  SHIPPED: 'wine',
  DELIVERED: 'green',
  CANCELLED: 'grey',
};
export const OrderStatusBadge = ({ status }: { status: string }) => <Badge tone={ORDER_TONE[status as OrderStatusKey] ?? 'grey'}>{ORDER_STATUS_LABEL[status as OrderStatusKey] ?? status}</Badge>;

const PAY_TONE: Record<string, Tone> = { PAID: 'green', PENDING: 'amber', UNPAID: 'amber', FAILED: 'red', REFUNDED: 'grey', PARTIAL: 'amber' };
export const PaymentBadge = ({ status }: { status: string }) => <Badge tone={PAY_TONE[status] ?? 'grey'}>{PAYMENT_STATUS_LABEL[status] ?? (status === 'PARTIAL' ? 'Partial' : status)}</Badge>;

const STOCK_TONE: Record<StockStatus, Tone> = { IN_STOCK: 'green', LOW_STOCK: 'amber', OUT_OF_STOCK: 'red' };
export const StockBadge = ({ status }: { status: StockStatus }) => <Badge tone={STOCK_TONE[status]}>{STOCK_STATUS_LABEL[status]}</Badge>;

export const ChannelBadge = ({ channel }: { channel: string }) => <Badge tone={channel === 'ONLINE' ? 'blue' : channel === 'WHATSAPP' ? 'green' : 'grey'}>{CHANNEL_LABEL[channel] ?? channel}</Badge>;

const STITCH_TONE: Record<string, Tone> = { NEW: 'wine', CONTACTED: 'amber', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'grey' };
export const StitchingBadge = ({ status }: { status: string }) => <Badge tone={STITCH_TONE[status] ?? 'grey'}>{STITCHING_STATUS_LABEL[status] ?? status}</Badge>;

const PURCHASE_TONE: Record<string, Tone> = { DRAFT: 'amber', RECEIVED: 'green', CANCELLED: 'grey' };
export const PurchaseStatusBadge = ({ status }: { status: string }) => <Badge tone={PURCHASE_TONE[status] ?? 'grey'}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
