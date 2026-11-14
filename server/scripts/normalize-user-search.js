const prisma = require('../src/config/prisma');
const { buildTeacherSearch } = require('../src/modules/users/user.service');

async function main() {
  let cursor;
  let updated = 0;

  while (true) {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      take: 100,
      ...(cursor ? { cursor, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        searchText: true,
      },
    });
    if (!teachers.length) break;

    const changes = teachers
      .map((teacher) => ({
        id: teacher.id,
        searchText: buildTeacherSearch(
          teacher.fullName,
          teacher.username,
          teacher.email,
          teacher.phone
        ),
      }))
      .filter((teacher, index) => teacher.searchText !== teachers[index].searchText);

    for (let index = 0; index < changes.length; index += 25) {
      await Promise.all(
        changes.slice(index, index + 25).map(({ id, searchText }) =>
          prisma.user.update({ where: { id }, data: { searchText } })
        )
      );
    }
    updated += changes.length;
    cursor = { id: teachers[teachers.length - 1].id };
  }

  console.log(`Đã chuẩn hóa searchText cho ${updated} giáo viên.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
