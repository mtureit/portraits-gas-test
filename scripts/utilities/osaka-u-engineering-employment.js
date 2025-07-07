// 大阪大学 工学研究科の産業別就職者数詳細分析
import dotenv from 'dotenv';
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';
import fs from 'fs';

// 環境変数の読み込み
dotenv.config();

// アクセスキー設定
const ACCESS_KEY = process.env.ACCESS_KEY;
const TARGET_YEAR = 2024;
const TARGET_UNIVERSITY = '大阪大学';
const TARGET_FACULTY_NAME = '工学研究科';

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

// メイン実行
async function main() {
  console.log(
    `🎓 ${TARGET_UNIVERSITY} ${TARGET_FACULTY_NAME} - 産業別就職者数分析`,
  );
  console.log('='.repeat(80));

  const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(TARGET_YEAR, [
    TARGET_UNIVERSITY,
  ]);
  const depts = orgIds[TARGET_UNIVERSITY] || [];

  const engineeringFaculty = depts.find((d) => d.DEP === TARGET_FACULTY_NAME);

  if (!engineeringFaculty) {
    console.log(`❌ ${TARGET_FACULTY_NAME}が見つかりませんでした。`);
    return;
  }

  console.log(
    `\n📚 対象学部: ${engineeringFaculty.DEP} (${engineeringFaculty.ID})`,
  );

  const content = await fetchData(
    'getStatusAfterGraduationJobs',
    TARGET_YEAR,
    engineeringFaculty.ID,
  );
  if (!content) {
    console.log('  ❌ 就職データ取得失敗');
    return;
  }

  const employmentData = {
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
            employmentData.byIndustry[industry] =
              (employmentData.byIndustry[industry] || 0) + count;
            employmentData.total += count;
          }
        });
      }
    });
  }

  console.log(
    `\n📊 ${TARGET_FACULTY_NAME} 総就職者数: ${employmentData.total}人`,
  );
  console.log('\n--- 産業別内訳 ---');

  const sortedIndustries = Object.entries(employmentData.byIndustry).sort(
    ([, a], [, b]) => b - a,
  );

  sortedIndustries.forEach(([industry, count]) => {
    console.log(`${industry}: ${count}人`);
  });

  const filePath = 'osaka-u-engineering-employment.json';
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        faculty: TARGET_FACULTY_NAME,
        ...employmentData,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\n💾 結果をファイルに保存: ${filePath}`);
}

main().catch((error) => console.error('❌ 実行エラー:', error));
