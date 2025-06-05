// Node.js環境でPortraits-GASライブラリを使用する例（詳細分析版）
import dotenv from 'dotenv';
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';

// 環境変数の読み込み
dotenv.config();

// アクセスキー設定
const ACCESS_KEY = process.env.ACCESS_KEY;

// 対象年度（最新3年分のみに短縮）
const YEARS = Array.from({ length: 3 }, (_, i) => 2024 - i);

// 分析対象大学（大学名のみを指定）
const TARGET_UNIVERSITIES = [
  '大阪大学',
  '静岡大学',
  '東京大学',
  '長岡技術科学大学',
];

// ユーティリティ関数
function toInt(x) {
  try {
    if (x === '' || x === null || x === undefined) return 0;
    return parseInt(String(x).replace(/,/g, ''), 10) || 0;
  } catch {
    return 0;
  }
}

// APIデータ取得関数
async function fetchData(apiMethod, year, orgId) {
  try {
    const result = await PortraitsAPI[apiMethod](ACCESS_KEY, year, orgId);
    if (result.GET_STATUS_LIST.RESULT.STATUS !== '0') {
      return null;
    }
    const dataInf = result.GET_STATUS_LIST.DATALIST_INF.DATA_INF;
    return dataInf && dataInf.length > 0 ? dataInf[0].CONTENT : null;
  } catch (error) {
    console.error(
      `API呼び出しエラー (${apiMethod}, ${year}, ${orgId}):`,
      error.message,
    );
    return null;
  }
}

// 大学名から大学IDを取得
function getUniversityId(univName) {
  try {
    const univIds = OrganizationIDs.getUnivIds([univName]);
    return univIds.length > 0 ? univIds[0].UNIV_ID : null;
  } catch (error) {
    console.error(`大学ID取得エラー (${univName}):`, error.message);
    return null;
  }
}

// 大学名から全学部・研究科の組織IDを取得
function getAllFacultyIds(univName) {
  try {
    const year = 2024; // 最新年度で検索
    const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(year, [univName]);
    const depts = orgIds[univName] || [];

    // 全ての学部・研究科のIDを返す
    return depts.map((dept) => dept.ID);
  } catch (error) {
    console.error(`学部・研究科ID取得エラー (${univName}):`, error.message);
    return [];
  }
}

// 学部別統計取得（志願者数・入学者数）
async function getDepartmentStats(univName) {
  console.log(`      学部・研究科ID取得中 (${univName})...`);
  const stats = [];
  const facultyIds = getAllFacultyIds(univName);
  console.log(`      取得した学部・研究科ID数: ${facultyIds.length}`);

  if (facultyIds.length > 0) {
    console.log(`      最初の3ID: ${facultyIds.slice(0, 3).join(', ')}`);
  }

  for (let i = 0; i < facultyIds.length; i++) {
    const facultyId = facultyIds[i];
    console.log(`      学部ID ${i + 1}/${facultyIds.length}: ${facultyId}`);

    for (const year of YEARS) {
      try {
        console.log(`        ${year}年度データ確認中...`);
        const detail = await fetchData(
          'getCollegeUndergraduateStudentsDetail',
          year,
          facultyId,
        );
        if (!detail) {
          console.log(`        ${year}年度: データなし`);
          continue;
        }

        console.log(`        ${year}年度: データ取得成功`);
        const gakkaGakuseiSu = detail.GAKKA_GAKUSEI_SU || [];
        for (const g of gakkaGakuseiSu) {
          const deptName = g.GAKKA?.GAKKA_MEI;
          if (!deptName) continue;

          stats.push({
            name: deptName,
            applicants: toInt(g.NYUGAKU_SHIGANSHA_SU),
            admitted: toInt(g.NYUGAKUSHA_SU),
          });
        }
        break; // その学部IDで年度1つ取れたらOK
      } catch (error) {
        console.error(
          `        学部統計取得エラー (${facultyId}, ${year}):`,
          error.message,
        );
      }
    }
  }

  return stats;
}

// 寄宿舎面積取得
async function getDormitoryArea(univId) {
  for (const year of YEARS) {
    try {
      const content = await fetchData('getSchoolFacilities', year, univId);
      if (!content) continue;

      const areaList = content.GAKKO_TOCHI_YOTO_AREA?.[0]?.AREA || [];
      for (const area of areaList) {
        if (area.AREA_YOTO === '寄宿舎施設') {
          return `${area.AREA} ${area.AREA_TANI}`;
        }
      }
    } catch (error) {
      console.error(
        `寄宿舎面積取得エラー (${univId}, ${year}):`,
        error.message,
      );
    }
  }
  return null;
}

// 産業別就職状況取得
async function getJobsByIndustry(univName) {
  const jobCounts = {};
  const facultyIds = getAllFacultyIds(univName);

  for (const facultyId of facultyIds) {
    for (const year of YEARS) {
      try {
        const content = await fetchData(
          'getStatusAfterGraduationJobs',
          year,
          facultyId,
        );
        if (!content) continue;

        const gakkaSenko = content.GAKKA_SENKO || [];
        for (const g of gakkaSenko) {
          const shushokushaSu = g.SANGYO_SHUSHOKUSHA_SU?.SHUSHOKUSHA_SU || [];
          for (const record of shushokushaSu) {
            const industry = record.SHUSHOKUSHA_SANGYO_BUNRUI?.split('／')[0];
            if (industry) {
              jobCounts[industry] =
                (jobCounts[industry] || 0) + toInt(record.SHUSHOKUSHA_SU);
            }
          }
        }
        break; // その学部IDで年度1つ取れたらOK
      } catch (error) {
        console.error(
          `就職状況取得エラー (${facultyId}, ${year}):`,
          error.message,
        );
      }
    }
  }

  // ソートして返す
  const sortedEntries = Object.entries(jobCounts).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return sortedEntries.length > 0 ? Object.fromEntries(sortedEntries) : null;
}

// 大学サマリー取得
async function getUniversitySummary(univName) {
  console.log(`  大学ID取得処理中 (${univName})...`);

  // 大学IDを取得
  const univId = getUniversityId(univName);
  console.log(`  大学ID取得結果: ${univId}`);

  if (!univId) {
    return { error: '大学IDが見つかりません' };
  }

  console.log(`  基本情報取得中 (ID: ${univId})...`);

  // 基本情報取得
  let baseData = null;
  for (const year of YEARS) {
    console.log(`    ${year}年度データを確認中...`);
    baseData = await fetchData('getStudentFacultyStatus', year, univId);
    if (baseData) {
      console.log(`    ${year}年度データ取得成功`);
      break;
    }
  }

  if (!baseData) {
    return { error: '基本票なし' };
  }

  const gakko = baseData.GAKKO;

  // 総学生数計算
  let totalStudents = 0;
  const chuyaKbn = baseData.GAKUSEI_SU?.CHUYA_KBN || [];
  for (const block of chuyaKbn) {
    for (const [key, value] of Object.entries(block)) {
      if (key.endsWith('_KEI')) {
        totalStudents += toInt(value);
      }
    }
  }

  console.log(`  学生数計算完了: ${totalStudents}人`);
  console.log(`  詳細データ取得開始...`);

  // 各種データを個別に取得（並行処理をやめてデバッグしやすくする）
  console.log(`    学部別統計取得中...`);
  const deptStats = await getDepartmentStats(univName);
  console.log(`    学部別統計取得完了: ${deptStats.length}件`);

  console.log(`    寄宿舎面積取得中...`);
  const dormArea = await getDormitoryArea(univId);
  console.log(`    寄宿舎面積取得完了: ${dormArea || '登録なし'}`);

  console.log(`    産業別就職状況取得中...`);
  const jobStats = await getJobsByIndustry(univName);
  console.log(
    `    産業別就職状況取得完了: ${jobStats ? Object.keys(jobStats).length : 0}業界`,
  );

  return {
    name: gakko.GAKKO_MEI,
    address: gakko.GAKKO_ADDR,
    students: totalStudents,
    departments: deptStats,
    dormitory: dormArea,
    jobs: jobStats,
    univId: univId,
  };
}

// メイン実行関数
async function main() {
  console.log('=== 大学ポートレート詳細分析（Node.js版）===\n');

  for (const univName of TARGET_UNIVERSITIES) {
    console.log(`\n━━━ ${univName} ━━━`);
    console.log(`処理開始...`);

    try {
      console.log(`大学IDを取得中...`);
      const info = await getUniversitySummary(univName);

      if (info.error) {
        console.log(`${univName}: ${info.error}\n`);
        continue;
      }

      console.log(`大学ID      : ${info.univId}`);
      console.log(`所在地      : ${info.address}`);
      console.log(`総学生数    : ${info.students.toLocaleString()}`);
      console.log(`寄宿舎面積  : ${info.dormitory || '登録なし'}`);

      // 学部別志願者数・入学者数
      console.log('学部別人数  :');
      if (info.departments.length > 0) {
        for (const dept of info.departments) {
          const nameFormatted = dept.name.padEnd(20);
          console.log(
            `  ${nameFormatted} 志願者 ${dept.applicants.toLocaleString()} / 入学者 ${dept.admitted.toLocaleString()}`,
          );
        }
      } else {
        console.log('  データ未登録');
      }

      // 産業別就職
      console.log('産業別就職  :');
      if (info.jobs) {
        for (const [industry, count] of Object.entries(info.jobs)) {
          const industryFormatted = industry.padEnd(12);
          console.log(`  ${industryFormatted}: ${count.toLocaleString()}`);
        }
      } else {
        console.log('  データ未登録');
      }
    } catch (error) {
      console.error(
        `${univName}の処理中にエラーが発生しました:`,
        error.message,
      );
    }
  }
}

// 実行
console.log('Portraits API 詳細分析の実行を開始します...\n');
main()
  .then(() => {
    console.log('\n実行完了');
  })
  .catch((error) => {
    console.error('実行エラー:', error.message);
  });
