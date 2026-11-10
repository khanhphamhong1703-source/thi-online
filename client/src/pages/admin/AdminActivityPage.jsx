import PageHeader from '../../components/PageHeader';
import ActivityLogPanel from './ActivityLogPanel';

export default function AdminActivityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Lịch sử hoạt động" fill />
      <ActivityLogPanel />
    </div>
  );
}
