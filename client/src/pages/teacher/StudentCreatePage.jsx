import { useParams } from 'react-router-dom';
import StudentForm from '../../components/teacher/StudentForm';

export default function StudentCreatePage() {
  const { id: classId } = useParams();
  return <StudentForm mode="add" classId={classId} />;
}
