import { useParams } from 'react-router-dom';
import ClassForm from '../../components/teacher/ClassForm';

export default function ClassEditPage() {
  const { id } = useParams();
  return <ClassForm mode="edit" classId={id} />;
}
