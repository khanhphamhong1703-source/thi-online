const prisma = require('../src/config/prisma');
const { buildSearchText } = require('../src/modules/students/student.service');

async function main() {
  let cursor;
  let updated = 0;

  while (true) {
    const students = await prisma.student.findMany({
      take: 100,
      ...(cursor ? { cursor, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        phone: true,
        email: true,
        searchText: true,
      },
    });
    if (!students.length) break;

    const changes = students
      .map((student) => ({
        id: student.id,
        searchText: buildSearchText(
          student.studentCode,
          student.fullName,
          student.phone,
          student.email
        ),
      }))
      .filter((student, index) => student.searchText !== students[index].searchText);

    for (let index = 0; index < changes.length; index += 25) {
      await Promise.all(
        changes.slice(index, index + 25).map(({ id, searchText }) =>
          prisma.student.update({ where: { id }, data: { searchText } })
        )
      );
    }
    updated += changes.length;
    cursor = { id: students[students.length - 1].id };
  }

  console.log(`Đã chuẩn hóa searchText cho ${updated} học sinh.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
