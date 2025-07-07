// 35項目の大学データ取得スクリプト（example-node.js準拠版）
import dotenv from 'dotenv';
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';
import fs from 'fs';

// 環境変数の読み込み
dotenv.config();

// アクセスキー設定
const ACCESS_KEY = process.env.ACCESS_KEY;

// 対象年度
const YEARS = Array.from({ length: 3 }, (_, i) => 2024 - i);

// 分析対象大学
const TARGET_UNIVERSITIES = [
  '大阪大学',
  '静岡大学',
  '東京大学',
  '長岡技術科学大学',
  '東北大学',
  '京都大学',
  '愛媛大学',
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

function toFloat(x) {
  try {
    if (x === '' || x === null || x === undefined) return 0;
    return parseFloat(String(x).replace(/,/g, '')) || 0;
  } catch {
    return 0;
  }
}

// APIデータ取得関数（example-node.jsと同じパターン）
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
    const year = 2024;
    const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(year, [univName]);
    const depts = orgIds[univName] || [];
    return depts.map((dept) => ({ id: dept.ID, name: dept.DEP }));
  } catch (error) {
    console.error(`学部・研究科ID取得エラー (${univName}):`, error.message);
    return [];
  }
}

// 35項目データ取得クラス
class UniversityData35Items {
  constructor(univName) {
    this.univName = univName;
    this.data = this.initializeData();
    this.errors = {};
  }

  initializeData() {
    return {
      // 1. 学生教員等状況票（5項目）
      studentFaculty: {
        totalStudents: 0, // 総学生数
        totalFaculty: 0, // 総教員数
        studentFacultyRatio: 0, // 学生教員比
        maleStudentRatio: 0, // 男子学生比率
        capacityUtilization: 0, // 収容定員充足率
      },

      // 2. 学部学生詳細（5項目）
      undergraduate: {
        studentsByGrade: {}, // 学年別学生数
        studentsByYear: {}, // 入学年度別学生数
        genderBreakdown: {}, // 男女別内訳
        dayNightBreakdown: {}, // 昼間夜間別
        transferStudents: 0, // 転入学・編入学者数
      },

      // 3. 大学院学生詳細（4項目）
      graduate: {
        mastersDoctoral: {}, // 修士博士別学生数
        departmentDetails: {}, // 研究科専攻別詳細
        workingAdults: 0, // 社会人学生数
        foreignStudents: 0, // 外国人学生数
      },

      // 4. 卒業後状況（5項目）
      careerOutcomes: {
        employmentRate: 0, // 就職率
        advancementRate: 0, // 進学率
        temporaryEmployment: 0, // 一時的な仕事
        others: 0, // その他
        unknown: 0, // 不詳・死亡
      },

      // 5. 就職先詳細（4項目）
      jobDetails: {
        industryBreakdown: {}, // 産業別就職者数
        occupationBreakdown: {}, // 職業別就職者数
        companySizeBreakdown: {}, // 企業規模別就職者数
        regionBreakdown: {}, // 地域別就職者数
      },

      // 6. 外国人学生（4項目）
      foreignStudents: {
        countryBreakdown: {}, // 国・地域別外国人学生数
        programBreakdown: {}, // 課程別外国人学生数
        scholarshipStatus: {}, // 奨学金受給状況
        visaStatus: {}, // 在留資格別状況
      },

      // 7. 施設情報（5項目）
      facilities: {
        landArea: 0, // 敷地面積
        buildingArea: 0, // 建物面積
        libraryInfo: {}, // 図書館情報
        sportsInfo: {}, // 体育施設情報
        researchFacilities: {}, // 研究施設情報
      },

      // 8. 組織構造（3項目）
      organization: {
        departmentCount: 0, // 学部・研究科数
        fieldDistribution: {}, // 分野分布
        educationLevels: {}, // 教育段階構成
      },

      // 9. 追加項目（8項目）
      additional: {
        dormitoryArea: 0, // 寄宿舎面積
        libraryBooks: 0, // 蔵書数
        researchBudget: 0, // 研究費
        internationalPrograms: 0, // 国際プログラム数
        industryCollaboration: 0, // 産学連携数
        patentApplications: 0, // 特許出願数
        graduateEmploymentRate: 0, // 大学院生就職率
        researchPapers: 0, // 研究論文数
      },
    };
  }

  addError(category, error) {
    this.errors[category] = error.message;
  }

  // 1. 学生教員等状況票の取得
  async fetchStudentFacultyStatus() {
    console.log(`    学生教員等状況票取得中...`);
    const univId = getUniversityId(this.univName);
    if (!univId) {
      this.addError('studentFaculty', new Error('大学ID取得失敗'));
      return;
    }

    for (const year of YEARS) {
      try {
        const content = await fetchData(
          'getStudentFacultyStatus',
          year,
          univId,
        );
        if (!content) continue;

        // 総学生数計算
        const chuyaKbn = content.GAKUSEI_SU?.CHUYA_KBN || [];
        let totalStudents = 0;
        for (const block of chuyaKbn) {
          for (const [key, value] of Object.entries(block)) {
            if (key.endsWith('_KEI')) {
              totalStudents += toInt(value);
            }
          }
        }

        // 教員数計算
        const kyoinSu = content.KYOIN_SU || {};
        let totalFaculty = 0;
        for (const [key, value] of Object.entries(kyoinSu)) {
          if (key.includes('KYOIN') && key.includes('KEI')) {
            totalFaculty += toInt(value);
          }
        }

        this.data.studentFaculty.totalStudents = totalStudents;
        this.data.studentFaculty.totalFaculty = totalFaculty;
        this.data.studentFaculty.studentFacultyRatio =
          totalFaculty > 0 ? totalStudents / totalFaculty : 0;

        console.log(`      学生数: ${totalStudents}, 教員数: ${totalFaculty}`);
        break;
      } catch (error) {
        this.addError('studentFaculty', error);
      }
    }
  }

  // 2. 学部学生詳細の取得
  async fetchUndergraduateDetails() {
    console.log(`    学部学生詳細取得中...`);
    const facultyIds = getAllFacultyIds(this.univName);
    let totalData = 0;

    for (const faculty of facultyIds.slice(0, 5)) {
      // 最初の5学部をサンプル
      for (const year of YEARS) {
        try {
          const content = await fetchData(
            'getCollegeUndergraduateStudentsDetail',
            year,
            faculty.id,
          );
          if (!content) continue;

          const gakkaGakuseiSu = content.GAKKA_GAKUSEI_SU || [];
          for (const g of gakkaGakuseiSu) {
            // 学年別学生数
            if (g.GAKUNEN_GAKUSEI_SU) {
              for (const grade of g.GAKUNEN_GAKUSEI_SU) {
                const gradeNum = grade.GAKUNEN;
                this.data.undergraduate.studentsByGrade[gradeNum] =
                  (this.data.undergraduate.studentsByGrade[gradeNum] || 0) +
                  toInt(grade.GAKUSEI_SU);
              }
            }

            // 転入学者数
            if (g.HENNYUGAKU_GAKUSEI_SU) {
              this.data.undergraduate.transferStudents += toInt(
                g.HENNYUGAKU_GAKUSEI_SU,
              );
            }

            totalData++;
          }
          break;
        } catch (error) {
          console.error(
            `      学部詳細取得エラー (${faculty.name}):`,
            error.message,
          );
        }
      }
    }

    console.log(`      処理した学科数: ${totalData}`);
  }

  // 3. 大学院学生詳細の取得
  async fetchGraduateDetails() {
    console.log(`    大学院学生詳細取得中...`);
    const facultyIds = getAllFacultyIds(this.univName);

    // 大学院関連の組織IDをフィルター
    const gradFacultyIds = facultyIds.filter(
      (f) =>
        f.id.includes('-2') ||
        f.id.includes('-4') ||
        f.id.includes('-5') ||
        f.id.includes('-6'),
    );

    let totalData = 0;

    for (const faculty of gradFacultyIds.slice(0, 5)) {
      for (const year of YEARS) {
        try {
          const content = await fetchData(
            'getGraduateStudentsDetail',
            year,
            faculty.id,
          );
          if (!content) continue;

          const gakkaSenko = content.GAKKA_SENKO || [];
          for (const g of gakkaSenko) {
            // 課程別学生数
            if (g.KATEI_GAKUSEI_SU) {
              for (const course of g.KATEI_GAKUSEI_SU) {
                const courseName = course.KATEI_KBN;
                this.data.graduate.mastersDoctoral[courseName] =
                  (this.data.graduate.mastersDoctoral[courseName] || 0) +
                  toInt(course.GAKUSEI_SU);
              }
            }

            // 社会人学生数
            if (g.SHAKAIJIN_GAKUSEI_SU) {
              this.data.graduate.workingAdults += toInt(g.SHAKAIJIN_GAKUSEI_SU);
            }

            totalData++;
          }
          break;
        } catch (error) {
          console.error(
            `      大学院詳細取得エラー (${faculty.name}):`,
            error.message,
          );
        }
      }
    }

    console.log(`      処理した専攻数: ${totalData}`);
  }

  // 4. 卒業後状況の取得
  async fetchCareerOutcomes() {
    console.log(`    卒業後状況取得中...`);
    const facultyIds = getAllFacultyIds(this.univName);
    let totalGraduates = 0;
    let totalEmployed = 0;
    let totalAdvanced = 0;

    for (const faculty of facultyIds.slice(0, 5)) {
      for (const year of YEARS) {
        try {
          const content = await fetchData(
            'getStatusAfterGraduationGraduates',
            year,
            faculty.id,
          );
          if (!content) continue;

          const gakkaSenko = content.GAKKA_SENKO || [];
          for (const g of gakkaSenko) {
            const sotsugyogoJokyo = g.SOTSUGYOGO_JOKYO || {};

            totalGraduates += toInt(sotsugyogoJokyo.SOTSUGYOSHA_SU);
            totalEmployed += toInt(sotsugyogoJokyo.SHUSHOKUSHA_SU);
            totalAdvanced += toInt(sotsugyogoJokyo.SHINGAKUSHA_SU);

            this.data.careerOutcomes.temporaryEmployment += toInt(
              sotsugyogoJokyo.ICHIJITEKI_SHIGOTO_SU,
            );
            this.data.careerOutcomes.others += toInt(sotsugyogoJokyo.SONOTA_SU);
            this.data.careerOutcomes.unknown += toInt(sotsugyogoJokyo.FUMEI_SU);
          }
          break;
        } catch (error) {
          console.error(
            `      進路状況取得エラー (${faculty.name}):`,
            error.message,
          );
        }
      }
    }

    this.data.careerOutcomes.employmentRate =
      totalGraduates > 0 ? (totalEmployed / totalGraduates) * 100 : 0;
    this.data.careerOutcomes.advancementRate =
      totalGraduates > 0 ? (totalAdvanced / totalGraduates) * 100 : 0;

    console.log(
      `      就職率: ${this.data.careerOutcomes.employmentRate.toFixed(1)}%`,
    );
  }

  // 5. 就職先詳細の取得
  async fetchJobDetails() {
    console.log(`    就職先詳細取得中...`);
    const facultyIds = getAllFacultyIds(this.univName);

    for (const faculty of facultyIds.slice(0, 5)) {
      for (const year of YEARS) {
        try {
          const content = await fetchData(
            'getStatusAfterGraduationJobs',
            year,
            faculty.id,
          );
          if (!content) continue;

          const gakkaSenko = content.GAKKA_SENKO || [];
          for (const g of gakkaSenko) {
            // 産業別就職者数
            const sangyoShushoku =
              g.SANGYO_SHUSHOKUSHA_SU?.SHUSHOKUSHA_SU || [];
            for (const record of sangyoShushoku) {
              const industry = record.SHUSHOKUSHA_SANGYO_BUNRUI?.split('／')[0];
              if (industry) {
                this.data.jobDetails.industryBreakdown[industry] =
                  (this.data.jobDetails.industryBreakdown[industry] || 0) +
                  toInt(record.SHUSHOKUSHA_SU);
              }
            }

            // 職業別就職者数
            const shokugyoShushoku =
              g.SHOKUGYO_SHUSHOKUSHA_SU?.SHUSHOKUSHA_SU || [];
            for (const record of shokugyoShushoku) {
              const occupation = record.SHUSHOKUSHA_SHOKUGYO_BUNRUI;
              if (occupation) {
                this.data.jobDetails.occupationBreakdown[occupation] =
                  (this.data.jobDetails.occupationBreakdown[occupation] || 0) +
                  toInt(record.SHUSHOKUSHA_SU);
              }
            }
          }
          break;
        } catch (error) {
          console.error(
            `      就職詳細取得エラー (${faculty.name}):`,
            error.message,
          );
        }
      }
    }

    console.log(
      `      産業分類数: ${Object.keys(this.data.jobDetails.industryBreakdown).length}`,
    );
  }

  // 6. 外国人学生情報の取得（スキップ - 仕様要確認）
  async fetchForeignStudents() {
    console.log(`    外国人学生情報: 仕様要確認のためスキップ`);
    // 外国人学生用組織IDの仕様が不明なため、今回はスキップ
  }

  // 7. 施設情報の取得
  async fetchFacilities() {
    console.log(`    施設情報取得中...`);
    const univId = getUniversityId(this.univName);
    if (!univId) return;

    for (const year of YEARS) {
      try {
        const content = await fetchData('getSchoolFacilities', year, univId);
        if (!content) continue;

        // 敷地面積
        const tochiMenseki = content.GAKKO_TOCHI_MENSEKI?.[0];
        if (tochiMenseki) {
          this.data.facilities.landArea = toFloat(tochiMenseki.TOCHI_MENSEKI);
        }

        // 建物面積
        const tatemonoMenseki = content.GAKKO_TATEMONO_MENSEKI?.[0];
        if (tatemonoMenseki) {
          this.data.facilities.buildingArea = toFloat(
            tatemonoMenseki.TATEMONO_MENSEKI,
          );
        }

        // 図書館情報
        const toshokan = content.GAKKO_TOSHOKAN_SHISETSU?.[0];
        if (toshokan) {
          this.data.facilities.libraryInfo = {
            area: toFloat(toshokan.TOSHOKAN_MENSEKI),
            books: toInt(toshokan.TOSHO_SU),
            seats: toInt(toshokan.ZASEKI_SU),
          };
        }

        // 寄宿舎面積（追加項目に含む）
        const areaList = content.GAKKO_TOCHI_YOTO_AREA?.[0]?.AREA || [];
        for (const area of areaList) {
          if (area.AREA_YOTO === '寄宿舎施設') {
            this.data.additional.dormitoryArea = toFloat(area.AREA);
            break;
          }
        }

        console.log(
          `      敷地: ${this.data.facilities.landArea}㎡, 建物: ${this.data.facilities.buildingArea}㎡`,
        );
        break;
      } catch (error) {
        this.addError('facilities', error);
      }
    }
  }

  // 8. 組織構造の分析
  analyzeOrganizationStructure() {
    console.log(`    組織構造分析中...`);
    const facultyIds = getAllFacultyIds(this.univName);

    this.data.organization.departmentCount = facultyIds.length;

    // 分野分布と教育段階の分析
    for (const faculty of facultyIds) {
      const idParts = faculty.id.split('-');
      if (idParts.length >= 4) {
        const levelCode = idParts[3].charAt(0);
        const fieldCode = idParts[3].substring(1, 4);

        this.data.organization.fieldDistribution[fieldCode] =
          (this.data.organization.fieldDistribution[fieldCode] || 0) + 1;
        this.data.organization.educationLevels[levelCode] =
          (this.data.organization.educationLevels[levelCode] || 0) + 1;
      }
    }

    console.log(`      総組織数: ${this.data.organization.departmentCount}`);
  }

  // 全データの取得
  async fetchAllData() {
    console.log(`  ${this.univName} のデータ取得開始`);

    await this.fetchStudentFacultyStatus();
    await this.fetchUndergraduateDetails();
    await this.fetchGraduateDetails();
    await this.fetchCareerOutcomes();
    await this.fetchJobDetails();
    await this.fetchForeignStudents();
    await this.fetchFacilities();
    this.analyzeOrganizationStructure();

    console.log(`  ${this.univName} のデータ取得完了`);
    return this.data;
  }
}

// 全大学のデータを取得
async function fetchAllUniversityData() {
  const allData = {};
  const allErrors = {};

  for (const univName of TARGET_UNIVERSITIES) {
    console.log(`\n━━━ ${univName} ━━━`);

    try {
      const university = new UniversityData35Items(univName);
      allData[univName] = await university.fetchAllData();
      allErrors[univName] = university.errors;

      // API制限を考慮した待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`${univName}の処理でエラー:`, error.message);
      allErrors[univName] = { general: error.message };
    }
  }

  return { data: allData, errors: allErrors };
}

// 結果をファイルに保存
function saveResults(results) {
  console.log('\n結果をファイルに保存中...');

  // JSON形式で保存
  const jsonData = {
    timestamp: new Date().toISOString(),
    targetYear: YEARS[0],
    universities: TARGET_UNIVERSITIES,
    data: results.data,
    errors: results.errors,
  };

  fs.writeFileSync(
    'university-35items-data.json',
    JSON.stringify(jsonData, null, 2),
    'utf8',
  );
  console.log('💾 詳細データ: university-35items-data.json');

  // CSV形式で要約データを保存
  const csvData = generateCSVSummary(results.data);
  fs.writeFileSync('university-35items-summary.csv', csvData, 'utf8');
  console.log('💾 要約データ: university-35items-summary.csv');
}

// CSV要約の生成
function generateCSVSummary(data) {
  const headers = [
    '大学名',
    '総学生数',
    '総教員数',
    '学生教員比',
    '就職率',
    '進学率',
    '学部数',
    '敷地面積',
    '建物面積',
    '図書館蔵書数',
    '寄宿舎面積',
    '産業分類数',
    '職業分類数',
    '工学系組織数',
    '医学系組織数',
    '文学系組織数',
  ];

  let csvContent = headers.join(',') + '\n';

  Object.entries(data).forEach(([univName, univData]) => {
    const row = [
      univName,
      univData.studentFaculty.totalStudents || 0,
      univData.studentFaculty.totalFaculty || 0,
      (univData.studentFaculty.studentFacultyRatio || 0).toFixed(1),
      (univData.careerOutcomes.employmentRate || 0).toFixed(1),
      (univData.careerOutcomes.advancementRate || 0).toFixed(1),
      univData.organization.departmentCount || 0,
      univData.facilities.landArea || 0,
      univData.facilities.buildingArea || 0,
      univData.facilities.libraryInfo?.books || 0,
      univData.additional.dormitoryArea || 0,
      Object.keys(univData.jobDetails.industryBreakdown || {}).length,
      Object.keys(univData.jobDetails.occupationBreakdown || {}).length,
      univData.organization.fieldDistribution?.G01 || 0,
      univData.organization.fieldDistribution?.M02 || 0,
      univData.organization.fieldDistribution?.A01 || 0,
    ];

    csvContent += row.join(',') + '\n';
  });

  return csvContent;
}

// 結果表示
function displayResults(results) {
  console.log('\n=== 取得結果サマリー ===');

  Object.entries(results.data).forEach(([univName, univData]) => {
    console.log(`\n${univName}:`);
    console.log(
      `  学生数: ${(univData.studentFaculty.totalStudents || 0).toLocaleString()}人`,
    );
    console.log(
      `  教員数: ${(univData.studentFaculty.totalFaculty || 0).toLocaleString()}人`,
    );
    console.log(
      `  就職率: ${(univData.careerOutcomes.employmentRate || 0).toFixed(1)}%`,
    );
    console.log(
      `  学部・研究科数: ${univData.organization.departmentCount || 0}`,
    );
    console.log(
      `  産業分類数: ${Object.keys(univData.jobDetails.industryBreakdown || {}).length}`,
    );

    const errorCount = Object.keys(results.errors[univName] || {}).length;
    if (errorCount > 0) {
      console.log(`  エラー: ${errorCount}件`);
    }
  });
}

// メイン実行関数
async function main() {
  console.log('=== 35項目大学データ取得システム ===');
  console.log(`対象大学: ${TARGET_UNIVERSITIES.join(', ')}`);
  console.log(`対象年度: ${YEARS.join(', ')}\n`);

  try {
    const results = await fetchAllUniversityData();

    displayResults(results);
    saveResults(results);

    console.log('\n🎉 すべての処理が完了しました！');
  } catch (error) {
    console.error('メイン処理でエラー:', error.message);
  }
}

// 実行
main();
