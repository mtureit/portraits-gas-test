// 大学データの実際の取得スクリプト
// 35項目の情報を行列形式で取得

import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';
import fs from 'fs';

// 設定
const TARGET_YEAR = 2024;
const TARGET_UNIVERSITIES = [
  '大阪大学',
  '東京大学',
  '京都大学',
  '東北大学',
  '静岡大学',
];

// APIアクセスキーの取得
function getApiAccessKey() {
  // 環境変数から取得を試行
  let accessKey = process.env.PORTRAITS_ACCESS_KEY;

  if (!accessKey) {
    console.log('⚠️  環境変数 PORTRAITS_ACCESS_KEY が設定されていません。');
    console.log('   以下のいずれかの方法でAPIキーを設定してください：');
    console.log('   1. export PORTRAITS_ACCESS_KEY="your_api_key"');
    console.log('   2. スクリプト内のAPI_KEY変数に直接設定');

    // スクリプト内で直接設定する場合はここに記述
    // accessKey = "your_api_key_here";

    if (!accessKey) {
      throw new Error('APIアクセスキーが設定されていません');
    }
  }

  return accessKey;
}

// データ収集の結果を保存する構造
class UniversityDataCollector {
  constructor() {
    this.data = {};
    this.errors = {};
  }

  addUniversity(univName) {
    this.data[univName] = {
      // 1. 学生教員等状況票（5項目）
      studentFacultyStatus: {
        totalStudents: null,
        facultyCount: null,
        studentFacultyRatio: null,
        genderRatio: null,
        capacityUtilization: null,
      },

      // 2. 学部学生詳細（5項目）
      undergraduateDetails: {
        studentsByGrade: null,
        studentsByYear: null,
        genderBreakdown: null,
        dayNightBreakdown: null,
        transferStudents: null,
      },

      // 3. 大学院学生詳細（4項目）
      graduateDetails: {
        studentsByDegree: null,
        departmentDetails: null,
        workingAdultStudents: null,
        foreignStudentsInGrad: null,
      },

      // 4. 卒業後状況（進路別）（5項目）
      careerOutcomes: {
        employmentRate: null,
        advancementRate: null,
        temporaryEmployment: null,
        others: null,
        unknown: null,
      },

      // 5. 就職先詳細（4項目）
      jobDetails: {
        industryBreakdown: null,
        occupationBreakdown: null,
        companySizeBreakdown: null,
        regionBreakdown: null,
      },

      // 6. 外国人学生（4項目）
      foreignStudents: {
        countryBreakdown: null,
        programBreakdown: null,
        scholarshipStatus: null,
        visaStatus: null,
      },

      // 7. 施設情報（5項目）
      facilities: {
        landArea: null,
        buildingArea: null,
        libraryInfo: null,
        sportsInfo: null,
        researchFacilities: null,
      },

      // 8. 組織構造（3項目）
      organizationStructure: {
        departmentCount: null,
        fieldDistribution: null,
        educationLevels: null,
      },
    };

    this.errors[univName] = {};
  }

  addError(univName, category, error) {
    this.errors[univName][category] = error.message;
  }

  addData(univName, category, field, value) {
    if (this.data[univName] && this.data[univName][category]) {
      this.data[univName][category][field] = value;
    }
  }
}

// 1. 学生教員等状況票の取得
async function fetchStudentFacultyStatus(
  accessKey,
  univId,
  univName,
  collector,
) {
  try {
    console.log(`  📊 学生教員等状況票を取得中...`);
    const data = await PortraitsAPI.getStudentFacultyStatus(
      accessKey,
      TARGET_YEAR,
      univId,
    );

    // データの構造を確認して適切な値を抽出
    if (data && data.length > 0) {
      // 実際のデータ構造に応じて調整が必要
      collector.addData(
        univName,
        'studentFacultyStatus',
        'totalStudents',
        data.length,
      );
      collector.addData(univName, 'studentFacultyStatus', 'rawData', data);
    }

    console.log(`    ✅ 完了（${data ? data.length : 0}件）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'studentFacultyStatus', error);
  }
}

// 2. 学部学生詳細の取得（組織IDごと）
async function fetchUndergraduateDetails(
  accessKey,
  orgIds,
  univName,
  collector,
) {
  try {
    console.log(`  🎓 学部学生詳細を取得中...`);
    let totalData = [];

    for (const org of orgIds.slice(0, 3)) {
      // 最初の3組織のみサンプル取得
      try {
        const data = await PortraitsAPI.getCollegeUndergraduateStudentsDetail(
          accessKey,
          TARGET_YEAR,
          org.ID,
        );
        if (data) {
          totalData.push({ orgName: org.DEP, data: data });
        }
        // API制限を考慮した待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`    ⚠️  ${org.DEP}: ${error.message}`);
      }
    }

    collector.addData(univName, 'undergraduateDetails', 'rawData', totalData);
    console.log(`    ✅ 完了（${totalData.length}組織）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'undergraduateDetails', error);
  }
}

// 3. 大学院学生詳細の取得
async function fetchGraduateDetails(accessKey, orgIds, univName, collector) {
  try {
    console.log(`  🎓 大学院学生詳細を取得中...`);
    let totalData = [];

    // 大学院関連の組織ID（レベル2,4,5,6を含む）をフィルター
    const gradOrgIds = orgIds.filter(
      (org) =>
        org.ID.includes('-2') ||
        org.ID.includes('-4') ||
        org.ID.includes('-5') ||
        org.ID.includes('-6'),
    );

    for (const org of gradOrgIds.slice(0, 3)) {
      // 最初の3組織のみサンプル取得
      try {
        const data = await PortraitsAPI.getGraduateStudentsDetail(
          accessKey,
          TARGET_YEAR,
          org.ID,
        );
        if (data) {
          totalData.push({ orgName: org.DEP, data: data });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`    ⚠️  ${org.DEP}: ${error.message}`);
      }
    }

    collector.addData(univName, 'graduateDetails', 'rawData', totalData);
    console.log(`    ✅ 完了（${totalData.length}組織）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'graduateDetails', error);
  }
}

// 4. 卒業後状況（進路別）の取得
async function fetchCareerOutcomes(accessKey, orgIds, univName, collector) {
  try {
    console.log(`  💼 卒業後状況（進路別）を取得中...`);
    let totalData = [];

    for (const org of orgIds.slice(0, 3)) {
      // 最初の3組織のみサンプル取得
      try {
        const data = await PortraitsAPI.getStatusAfterGraduationGraduates(
          accessKey,
          TARGET_YEAR,
          org.ID,
        );
        if (data) {
          totalData.push({ orgName: org.DEP, data: data });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`    ⚠️  ${org.DEP}: ${error.message}`);
      }
    }

    collector.addData(univName, 'careerOutcomes', 'rawData', totalData);
    console.log(`    ✅ 完了（${totalData.length}組織）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'careerOutcomes', error);
  }
}

// 5. 就職先詳細の取得
async function fetchJobDetails(accessKey, orgIds, univName, collector) {
  try {
    console.log(`  🏢 就職先詳細を取得中...`);
    let totalData = [];

    for (const org of orgIds.slice(0, 3)) {
      // 最初の3組織のみサンプル取得
      try {
        const data = await PortraitsAPI.getStatusAfterGraduationJobs(
          accessKey,
          TARGET_YEAR,
          org.ID,
        );
        if (data) {
          totalData.push({ orgName: org.DEP, data: data });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`    ⚠️  ${org.DEP}: ${error.message}`);
      }
    }

    collector.addData(univName, 'jobDetails', 'rawData', totalData);
    console.log(`    ✅ 完了（${totalData.length}組織）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'jobDetails', error);
  }
}

// 6. 外国人学生情報の取得
async function fetchForeignStudents(accessKey, univId, univName, collector) {
  try {
    console.log(`  🌍 外国人学生情報を取得中...`);
    // 外国人学生用の組織IDが必要（通常は大学ID + 特定のサフィックス）
    // 実装は外国人学生用組織IDの仕様に依存
    collector.addData(
      univName,
      'foreignStudents',
      'status',
      '外国人学生用組織ID仕様要確認',
    );
    console.log(`    ⚠️  外国人学生用組織IDの仕様要確認`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'foreignStudents', error);
  }
}

// 7. 施設情報の取得
async function fetchFacilities(accessKey, univId, univName, collector) {
  try {
    console.log(`  🏫 施設情報を取得中...`);
    const data = await PortraitsAPI.getSchoolFacilities(
      accessKey,
      TARGET_YEAR,
      univId,
    );

    collector.addData(univName, 'facilities', 'rawData', data);
    console.log(`    ✅ 完了`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'facilities', error);
  }
}

// 8. 組織構造の分析
function analyzeOrganizationStructure(orgIds, univName, collector) {
  try {
    console.log(`  🏛️  組織構造を分析中...`);

    const departmentCount = orgIds.length;

    // 分野分布の分析
    const fieldDistribution = {};
    const educationLevels = {};

    orgIds.forEach((org) => {
      // 組織IDから分野と教育段階を抽出
      const idParts = org.ID.split('-');
      if (idParts.length >= 4) {
        const levelCode = idParts[3].charAt(0);
        const fieldCode = idParts[3].substring(1, 4);

        fieldDistribution[fieldCode] = (fieldDistribution[fieldCode] || 0) + 1;
        educationLevels[levelCode] = (educationLevels[levelCode] || 0) + 1;
      }
    });

    collector.addData(
      univName,
      'organizationStructure',
      'departmentCount',
      departmentCount,
    );
    collector.addData(
      univName,
      'organizationStructure',
      'fieldDistribution',
      fieldDistribution,
    );
    collector.addData(
      univName,
      'organizationStructure',
      'educationLevels',
      educationLevels,
    );

    console.log(`    ✅ 完了（${departmentCount}組織）`);
  } catch (error) {
    console.log(`    ❌ エラー: ${error.message}`);
    collector.addError(univName, 'organizationStructure', error);
  }
}

// 大学データの収集（メイン関数）
async function collectUniversityData(univName, accessKey, collector) {
  console.log(`\n🏫 ${univName} のデータ収集開始`);
  console.log('━'.repeat(50));

  collector.addUniversity(univName);

  try {
    // 大学IDの取得
    const univInfo = OrganizationIDs.getUnivIds([univName]);
    if (!univInfo || univInfo.length === 0) {
      throw new Error('大学ID情報が見つかりません');
    }
    const univId = univInfo[0].UNIV_ID;
    console.log(`📍 大学ID: ${univId}`);

    // 組織ID情報の取得
    const orgIdsByUniv = OrganizationIDs.getOrganizationIdsbyUniv(TARGET_YEAR, [
      univName,
    ]);
    const orgIds = orgIdsByUniv[univName] || [];
    console.log(`📋 組織数: ${orgIds.length}`);

    if (orgIds.length === 0) {
      console.log('⚠️  組織ID情報が見つかりません');
      return;
    }

    // 各種データの収集
    await fetchStudentFacultyStatus(accessKey, univId, univName, collector);
    await fetchUndergraduateDetails(accessKey, orgIds, univName, collector);
    await fetchGraduateDetails(accessKey, orgIds, univName, collector);
    await fetchCareerOutcomes(accessKey, orgIds, univName, collector);
    await fetchJobDetails(accessKey, orgIds, univName, collector);
    await fetchForeignStudents(accessKey, univId, univName, collector);
    await fetchFacilities(accessKey, univId, univName, collector);
    analyzeOrganizationStructure(orgIds, univName, collector);

    console.log(`✅ ${univName} のデータ収集完了`);
  } catch (error) {
    console.log(`❌ ${univName} のデータ収集でエラー: ${error.message}`);
    collector.addError(univName, 'general', error);
  }
}

// 結果の保存
function saveResults(collector) {
  console.log('\n💾 結果をファイルに保存中...');

  // JSON形式で詳細データを保存
  const jsonData = {
    timestamp: new Date().toISOString(),
    targetYear: TARGET_YEAR,
    universities: TARGET_UNIVERSITIES,
    data: collector.data,
    errors: collector.errors,
  };

  fs.writeFileSync(
    'university-data-detailed.json',
    JSON.stringify(jsonData, null, 2),
    'utf8',
  );
  console.log('💾 詳細データ: university-data-detailed.json');

  // CSV形式で要約データを保存
  const csvData = generateCSVSummary(collector);
  fs.writeFileSync('university-data-summary.csv', csvData, 'utf8');
  console.log('💾 要約データ: university-data-summary.csv');
}

// CSV要約の生成
function generateCSVSummary(collector) {
  const headers = [
    '大学名',
    '組織数',
    '学生教員状況_取得',
    '学部詳細_取得',
    '大学院詳細_取得',
    '進路状況_取得',
    '就職詳細_取得',
    '外国人学生_取得',
    '施設情報_取得',
    '組織分析_取得',
    'エラー数',
  ];

  let csvContent = headers.join(',') + '\n';

  Object.keys(collector.data).forEach((univName) => {
    const univData = collector.data[univName];
    const univErrors = collector.errors[univName];

    const row = [
      univName,
      univData.organizationStructure.departmentCount || 0,
      univData.studentFacultyStatus.rawData ? 'あり' : 'なし',
      univData.undergraduateDetails.rawData ? 'あり' : 'なし',
      univData.graduateDetails.rawData ? 'あり' : 'なし',
      univData.careerOutcomes.rawData ? 'あり' : 'なし',
      univData.jobDetails.rawData ? 'あり' : 'なし',
      univData.foreignStudents.status ? 'あり' : 'なし',
      univData.facilities.rawData ? 'あり' : 'なし',
      univData.organizationStructure.departmentCount ? 'あり' : 'なし',
      Object.keys(univErrors).length,
    ];

    csvContent += row.join(',') + '\n';
  });

  return csvContent;
}

// メイン実行関数
async function main() {
  console.log('🎓 大学データ収集システム - 35項目の情報取得');
  console.log('='.repeat(80));
  console.log(`📅 対象年度: ${TARGET_YEAR}`);
  console.log(`🏫 対象大学: ${TARGET_UNIVERSITIES.join(', ')}`);
  console.log('');

  try {
    // APIアクセスキーの取得
    const accessKey = getApiAccessKey();
    console.log('🔑 APIアクセスキーを確認しました');

    // データコレクターの初期化
    const collector = new UniversityDataCollector();

    // 各大学のデータ収集
    for (const univName of TARGET_UNIVERSITIES) {
      await collectUniversityData(univName, accessKey, collector);

      // API制限を考慮した待機（大学間）
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 結果の保存
    saveResults(collector);

    console.log('\n🎉 すべての処理が完了しました！');
    console.log('\n📊 取得結果サマリー:');

    Object.keys(collector.data).forEach((univName) => {
      const errorCount = Object.keys(collector.errors[univName]).length;
      const dataCount = Object.values(collector.data[univName]).filter(
        (category) => category.rawData || category.departmentCount,
      ).length;

      console.log(
        `  ${univName}: データ${dataCount}/8カテゴリ, エラー${errorCount}件`,
      );
    });
  } catch (error) {
    console.error('❌ システムエラー:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

// 実行
main();
