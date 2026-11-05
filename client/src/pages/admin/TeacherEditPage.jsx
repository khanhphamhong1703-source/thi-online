import { useParams } from 'react-router-dom';
import TeacherForm from '../../components/admin/TeacherForm';

export default function TeacherEditPage() {
  const { id } = useParams();
  return <TeacherForm mode="edit" teacherId={id} />;
}
