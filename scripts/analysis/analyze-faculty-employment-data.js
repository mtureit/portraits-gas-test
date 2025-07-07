// 学部ごとの産業別就職者数詳細分析
import dotenv from 'dotenv';
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';
import fs from 'fs';

// 環境変数の読み込み
dotenv.config();

// アクセスキー設定
const ACCESS_KEY = process.env.ACCESS_KEY;
const TARGET_YEAR = 2024;

// 調査対象大学
const TARGET_UNIVERSITIES = ['大阪大学', '東京大学', '静岡大学'];

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
      console.log(`  ⚠️ APIエラー: ${result.GET_STATUS_LIST.RESULT.ERROR_MSG}`);
      return null;
    }
    const dataInf = result.GET_STATUS_LIST.DATALIST_INF.DATA_INF;
    return dataInf && dataInf.length > 0 ? dataInf[0].CONTENT : null;
  } catch (error) {
    console.error(`  ❌ API呼び出しエラー (${apiMethod}):`, error.message);
    return null;
  }
}

// 学部ごとの就職者数詳細分析
class FacultyEmploymentAnalyzer {
  constructor() {
    this.results = {};
  }

  // 大学の学部別就職者数分析
  async analyzeFacultyEmployment(univName) {
    console.log(`\n🎓 ${univName} - 学部別産業別就職者数分析`);
    console.log('='.repeat(80));

    const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(TARGET_YEAR, [
      univName,
    ]);
    const depts = orgIds[univName] || [];

    const universityData = {
      totalEmployed: 0,
      faculties: {},
      industriesSummary: {},
    };

    console.log(`学部・研究科数: ${depts.length}`);

    // 各学部の就職データを調査
    for (const dept of depts) {
      console.log(`\n📚 学部: ${dept.DEP} (${dept.ID})`);

      const content = await fetchData(
        'getStatusAfterGraduationJobs',
        TARGET_YEAR,
        dept.ID,
      );
      if (!content) {
        console.log('  ❌ 就職データ取得失敗');
        continue;
      }

      const facultyEmployment = {
        total: 0,
        byIndustry: {},
      };

      if (content.GAKKA_SENKO && Array.isArray(content.GAKKA_SENKO)) {
        content.GAKKA_SENKO.forEach((senko) => {
          if (senko.SANGYO_SHUSHOKUSHA_SU?.SHUSHOKUSHA_SU) {
            senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU.forEach((record) => {
              const industry = record.SHUSHOKUSHA_SANGYO_BUNRUI;
              const count = toInt(record.SHUSHOKUSHA_SU);

              if (industry && count > 0) {
                facultyEmployment.byIndustry[industry] =
                  (facultyEmployment.byIndustry[industry] || 0) + count;
                facultyEmployment.total += count;

                universityData.industriesSummary[industry] =
                  (universityData.industriesSummary[industry] || 0) + count;
              }
            });
          }
        });
      }

      if (facultyEmployment.total > 0) {
        universityData.faculties[dept.DEP] = facultyEmployment;
        universityData.totalEmployed += facultyEmployment.total;
        console.log(
          `  ✅ ${dept.DEP}: ${facultyEmployment.total}人の就職者データを集計`,
        );
      } else {
        console.log(`  ℹ️ ${dept.DEP}: 就職者データなし`);
      }

      // API制限を考慮した待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.results[univName] = universityData;
    console.log(`\n📊 ${univName} 総計: ${universityData.totalEmployed}人`);
  }

  // 全大学の調査実行
  async analyzeAll() {
    for (const univName of TARGET_UNIVERSITIES) {
      await this.analyzeFacultyEmployment(univName);
    }
  }

  // 結果保存
  saveResults() {
    const filePath = 'faculty-employment-data.json';
    fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2), 'utf8');
    console.log(`\n💾 結果をファイルに保存: ${filePath}`);
  }
}

// メイン実行
async function main() {
  try {
    const analyzer = new FacultyEmploymentAnalyzer();
    await analyzer.analyzeAll();
    analyzer.saveResults();

    console.log('\n🎉 学部別就職者数の詳細分析が完了しました！');
  } catch (error) {
    console.error('❌ 分析エラー:', error.message);
  }
}

main();
