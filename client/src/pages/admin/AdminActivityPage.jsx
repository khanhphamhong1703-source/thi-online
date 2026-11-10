import PageHeader from '../../components/PageHeader';
import ActivityLogPanel from './ActivityLogPanel';

export default function AdminActivityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Giám sát"
        title="Lịch sử hoạt động"
        description="Tra soát đăng nhập và thao tác của giáo viên trên toàn hệ thống."
      />
      <ActivityLogPanel />
    </div>
  );
}
