import { useParams } from 'react-router-dom';
import StudentForm from '../../components/teacher/StudentForm';

export default function StudentEditPage() {
  const { id } = useParams();
  return <StudentForm mode="edit" studentId={id} />;
}
