// 土地用途・建物用途・産業分類の元データ構造詳細調査
import dotenv from 'dotenv';
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';
import fs from 'fs';

// 環境変数の読み込み
dotenv.config();

// アクセスキー設定
const ACCESS_KEY = process.env.ACCESS_KEY;
const TARGET_YEAR = 2024;

// 調査対象大学（代表的な3校）
const INVESTIGATION_UNIVERSITIES = [
  '大阪大学', // 総合大学
  '東京大学', // 総合大学
  '静岡大学', // 地方国立大学
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

// カテゴリデータ詳細調査クラス
class CategoryDataInvestigator {
  constructor() {
    this.results = {
      landUseTypes: {
        universities: {},
        allTypes: new Set(),
        detailedStructure: {},
        valueExamples: {},
      },
      buildingUseTypes: {
        universities: {},
        allTypes: new Set(),
        detailedStructure: {},
        valueExamples: {},
      },
      industryClassifications: {
        universities: {},
        allClassifications: new Set(),
        detailedStructure: {},
        valueExamples: {},
      },
    };
  }

  // 1. 土地用途の詳細調査
  async investigateLandUseTypes(univName) {
    console.log(`\n🏞️ ${univName} - 土地用途データ詳細調査`);
    console.log('='.repeat(60));

    const univIds = OrganizationIDs.getUnivIds([univName]);
    if (!univIds || univIds.length === 0) {
      console.log('❌ 大学ID取得失敗');
      return;
    }

    const univId = univIds[0].UNIV_ID;
    const content = await fetchData('getSchoolFacilities', TARGET_YEAR, univId);

    if (!content) {
      console.log('❌ 施設データ取得失敗');
      return;
    }

    const landData = {
      rawStructure: {},
      useTypes: new Set(),
      areaData: {},
      totalArea: 0,
    };

    console.log('\n📋 生データ構造 (GAKKO_TOCHI_YOTO_AREA):');
    if (content.GAKKO_TOCHI_YOTO_AREA) {
      console.log(`配列長: ${content.GAKKO_TOCHI_YOTO_AREA.length}`);

      content.GAKKO_TOCHI_YOTO_AREA.forEach((areaBlock, blockIndex) => {
        console.log(`\nブロック${blockIndex + 1}:`);
        console.log('  キー:', Object.keys(areaBlock));

        if (areaBlock.AREA_KEI) {
          console.log(`  AREA_KEI: ${areaBlock.AREA_KEI}`);
        }

        if (areaBlock.AREA && Array.isArray(areaBlock.AREA)) {
          console.log(`  AREA配列数: ${areaBlock.AREA.length}`);

          areaBlock.AREA.forEach((areaItem, itemIndex) => {
            console.log(`    項目${itemIndex + 1}:`);
            console.log(`      AREA: ${areaItem.AREA}`);
            console.log(`      AREA_YOTO: "${areaItem.AREA_YOTO}"`);
            console.log(`      AREA_TANI: "${areaItem.AREA_TANI}"`);

            // データ集計
            const useType = areaItem.AREA_YOTO;
            const area = toFloat(areaItem.AREA);

            if (useType) {
              landData.useTypes.add(useType);
              this.results.landUseTypes.allTypes.add(useType);

              if (!landData.areaData[useType]) {
                landData.areaData[useType] = 0;
              }
              landData.areaData[useType] += area;
              landData.totalArea += area;

              // 詳細構造の保存
              if (!this.results.landUseTypes.detailedStructure[useType]) {
                this.results.landUseTypes.detailedStructure[useType] = {
                  universities: new Set(),
                  areas: [],
                  unit: areaItem.AREA_TANI,
                };
              }
              this.results.landUseTypes.detailedStructure[
                useType
              ].universities.add(univName);
              this.results.landUseTypes.detailedStructure[useType].areas.push(
                area,
              );
            }
          });
        }
      });
    }

    console.log('\n📊 集計結果:');
    console.log(`総敷地面積: ${landData.totalArea.toLocaleString()}㎡`);
    console.log(`用途種類数: ${landData.useTypes.size}種類`);

    const sortedUseTypes = Array.from(landData.useTypes).sort();
    sortedUseTypes.forEach((useType) => {
      const area = landData.areaData[useType];
      const percentage = ((area / landData.totalArea) * 100).toFixed(1);
      console.log(
        `  • ${useType}: ${area.toLocaleString()}㎡ (${percentage}%)`,
      );
    });

    this.results.landUseTypes.universities[univName] = landData;
  }

  // 2. 建物用途の詳細調査
  async investigateBuildingUseTypes(univName) {
    console.log(`\n🏢 ${univName} - 建物用途データ詳細調査`);
    console.log('='.repeat(60));

    const univIds = OrganizationIDs.getUnivIds([univName]);
    const univId = univIds[0].UNIV_ID;
    const content = await fetchData('getSchoolFacilities', TARGET_YEAR, univId);

    if (!content) {
      console.log('❌ 施設データ取得失敗');
      return;
    }

    const buildingData = {
      rawStructure: {},
      useTypes: new Set(),
      areaData: {},
      totalArea: 0,
    };

    console.log('\n📋 生データ構造 (GAKKO_TATEMONO_YOTO_AREA):');
    if (content.GAKKO_TATEMONO_YOTO_AREA) {
      console.log(`配列長: ${content.GAKKO_TATEMONO_YOTO_AREA.length}`);

      content.GAKKO_TATEMONO_YOTO_AREA.forEach((areaBlock, blockIndex) => {
        console.log(`\nブロック${blockIndex + 1}:`);
        console.log('  キー:', Object.keys(areaBlock));

        if (areaBlock.AREA_KEI) {
          console.log(`  AREA_KEI: ${areaBlock.AREA_KEI}`);
        }

        if (areaBlock.AREA && Array.isArray(areaBlock.AREA)) {
          console.log(`  AREA配列数: ${areaBlock.AREA.length}`);

          areaBlock.AREA.forEach((areaItem, itemIndex) => {
            console.log(`    項目${itemIndex + 1}:`);
            console.log(`      AREA: ${areaItem.AREA}`);
            console.log(`      AREA_YOTO: "${areaItem.AREA_YOTO}"`);
            console.log(`      AREA_TANI: "${areaItem.AREA_TANI}"`);

            // データ集計
            const useType = areaItem.AREA_YOTO;
            const area = toFloat(areaItem.AREA);

            if (useType) {
              buildingData.useTypes.add(useType);
              this.results.buildingUseTypes.allTypes.add(useType);

              if (!buildingData.areaData[useType]) {
                buildingData.areaData[useType] = 0;
              }
              buildingData.areaData[useType] += area;
              buildingData.totalArea += area;

              // 詳細構造の保存
              if (!this.results.buildingUseTypes.detailedStructure[useType]) {
                this.results.buildingUseTypes.detailedStructure[useType] = {
                  universities: new Set(),
                  areas: [],
                  unit: areaItem.AREA_TANI,
                };
              }
              this.results.buildingUseTypes.detailedStructure[
                useType
              ].universities.add(univName);
              this.results.buildingUseTypes.detailedStructure[
                useType
              ].areas.push(area);
            }
          });
        }
      });
    }

    console.log('\n📊 集計結果:');
    console.log(`総建物面積: ${buildingData.totalArea.toLocaleString()}㎡`);
    console.log(`用途種類数: ${buildingData.useTypes.size}種類`);

    const sortedUseTypes = Array.from(buildingData.useTypes).sort();
    sortedUseTypes.forEach((useType) => {
      const area = buildingData.areaData[useType];
      const percentage = ((area / buildingData.totalArea) * 100).toFixed(1);
      console.log(
        `  • ${useType}: ${area.toLocaleString()}㎡ (${percentage}%)`,
      );
    });

    this.results.buildingUseTypes.universities[univName] = buildingData;
  }

  // 3. 産業分類の詳細調査
  async investigateIndustryClassifications(univName) {
    console.log(`\n💼 ${univName} - 産業分類データ詳細調査`);
    console.log('='.repeat(60));

    const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(TARGET_YEAR, [
      univName,
    ]);
    const depts = orgIds[univName] || [];

    const industryData = {
      rawStructure: {},
      classifications: new Set(),
      employmentData: {},
      totalEmployed: 0,
      departmentCount: 0,
    };

    console.log(`学部・研究科数: ${depts.length}`);

    // サンプルとして最初の5学部の就職データを調査
    for (const dept of depts.slice(0, 5)) {
      console.log(`\n📚 学部: ${dept.DEP} (${dept.ID})`);

      const content = await fetchData(
        'getStatusAfterGraduationJobs',
        TARGET_YEAR,
        dept.ID,
      );
      if (content) {
        industryData.departmentCount++;

        console.log('  📋 生データ構造 (SANGYO_SHUSHOKUSHA_SU):');
        if (content.GAKKA_SENKO && Array.isArray(content.GAKKA_SENKO)) {
          console.log(`    GAKKA_SENKO配列長: ${content.GAKKA_SENKO.length}`);

          content.GAKKA_SENKO.forEach((senko, senkoIndex) => {
            console.log(
              `    専攻${senkoIndex + 1}: ${senko.GAKKA_MEI || '名称不明'}`,
            );

            if (senko.SANGYO_SHUSHOKUSHA_SU) {
              console.log(
                '      SANGYO_SHUSHOKUSHA_SUキー:',
                Object.keys(senko.SANGYO_SHUSHOKUSHA_SU),
              );

              if (senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU_KEI_M) {
                console.log(
                  `      男性就職者合計: ${senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU_KEI_M}`,
                );
              }
              if (senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU_KEI_F) {
                console.log(
                  `      女性就職者合計: ${senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU_KEI_F}`,
                );
              }

              if (
                senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU &&
                Array.isArray(senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU)
              ) {
                console.log(
                  `      産業別データ数: ${senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU.length}`,
                );

                // 最初の5件の詳細を表示
                senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU.slice(0, 5).forEach(
                  (record, recordIndex) => {
                    console.log(
                      `        ${recordIndex + 1}. 産業: "${record.SHUSHOKUSHA_SANGYO_BUNRUI}"`,
                    );
                    console.log(
                      `           就職者数: ${record.SHUSHOKUSHA_SU}`,
                    );
                    console.log(`           性別: ${record.SHUSHOKUSHA_SEX}`);

                    // データ集計
                    const industry = record.SHUSHOKUSHA_SANGYO_BUNRUI;
                    const count = toInt(record.SHUSHOKUSHA_SU);

                    if (industry && count > 0) {
                      industryData.classifications.add(industry);
                      this.results.industryClassifications.allClassifications.add(
                        industry,
                      );

                      if (!industryData.employmentData[industry]) {
                        industryData.employmentData[industry] = 0;
                      }
                      industryData.employmentData[industry] += count;
                      industryData.totalEmployed += count;

                      // 詳細構造の保存
                      if (
                        !this.results.industryClassifications.detailedStructure[
                          industry
                        ]
                      ) {
                        this.results.industryClassifications.detailedStructure[
                          industry
                        ] = {
                          universities: new Set(),
                          counts: [],
                          departments: new Set(),
                        };
                      }
                      this.results.industryClassifications.detailedStructure[
                        industry
                      ].universities.add(univName);
                      this.results.industryClassifications.detailedStructure[
                        industry
                      ].counts.push(count);
                      this.results.industryClassifications.detailedStructure[
                        industry
                      ].departments.add(dept.DEP);
                    }
                  },
                );

                if (senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU.length > 5) {
                  console.log(
                    `        ... 他${senko.SANGYO_SHUSHOKUSHA_SU.SHUSHOKUSHA_SU.length - 5}件`,
                  );
                }
              }
            }
          });
        }
      } else {
        console.log('  ❌ 就職データ取得失敗');
      }

      // API制限を考慮した待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n📊 集計結果:');
    console.log(`分析対象学部数: ${industryData.departmentCount}`);
    console.log(`総就職者数: ${industryData.totalEmployed}人`);
    console.log(`産業分類数: ${industryData.classifications.size}種類`);

    const sortedIndustries = Object.entries(industryData.employmentData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    console.log('\n上位10産業:');
    sortedIndustries.forEach(([industry, count], index) => {
      const percentage = ((count / industryData.totalEmployed) * 100).toFixed(
        1,
      );
      console.log(`  ${index + 1}. ${industry}: ${count}人 (${percentage}%)`);
    });

    this.results.industryClassifications.universities[univName] = industryData;
  }

  // 4. 全大学の調査実行
  async investigateAllUniversities() {
    console.log('🔍 カテゴリデータ構造詳細調査開始');
    console.log('='.repeat(80));
    console.log(`対象大学: ${INVESTIGATION_UNIVERSITIES.join(', ')}`);
    console.log('');

    for (const univName of INVESTIGATION_UNIVERSITIES) {
      console.log(`\n🎓 ${univName} の調査開始`);
      console.log('━'.repeat(50));

      await this.investigateLandUseTypes(univName);
      await this.investigateBuildingUseTypes(univName);
      await this.investigateIndustryClassifications(univName);

      // 大学間での待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 5. 総合分析結果の表示
  analyzeOverallResults() {
    console.log('\n📊 総合分析結果');
    console.log('='.repeat(80));

    // 土地用途の総合分析
    console.log('\n🏞️ 土地用途 総合分析:');
    console.log(
      `全大学共通の土地用途数: ${this.results.landUseTypes.allTypes.size}種類`,
    );

    const landUseAnalysis = {};
    Array.from(this.results.landUseTypes.allTypes).forEach((useType) => {
      const structure = this.results.landUseTypes.detailedStructure[useType];
      landUseAnalysis[useType] = {
        universityCount: structure.universities.size,
        totalArea: structure.areas.reduce((sum, area) => sum + area, 0),
        avgArea:
          structure.areas.reduce((sum, area) => sum + area, 0) /
          structure.areas.length,
        unit: structure.unit,
      };
    });

    const sortedLandUses = Object.entries(landUseAnalysis).sort(
      ([, a], [, b]) => b.universityCount - a.universityCount,
    );

    console.log('\n共通度順 土地用途:');
    sortedLandUses.forEach(([useType, data], index) => {
      console.log(
        `  ${index + 1}. "${useType}": ${data.universityCount}大学, 平均${Math.round(data.avgArea).toLocaleString()}${data.unit}`,
      );
    });

    // 建物用途の総合分析
    console.log('\n🏢 建物用途 総合分析:');
    console.log(
      `全大学共通の建物用途数: ${this.results.buildingUseTypes.allTypes.size}種類`,
    );

    const buildingUseAnalysis = {};
    Array.from(this.results.buildingUseTypes.allTypes).forEach((useType) => {
      const structure =
        this.results.buildingUseTypes.detailedStructure[useType];
      buildingUseAnalysis[useType] = {
        universityCount: structure.universities.size,
        totalArea: structure.areas.reduce((sum, area) => sum + area, 0),
        avgArea:
          structure.areas.reduce((sum, area) => sum + area, 0) /
          structure.areas.length,
        unit: structure.unit,
      };
    });

    const sortedBuildingUses = Object.entries(buildingUseAnalysis).sort(
      ([, a], [, b]) => b.universityCount - a.universityCount,
    );

    console.log('\n共通度順 建物用途:');
    sortedBuildingUses.forEach(([useType, data], index) => {
      console.log(
        `  ${index + 1}. "${useType}": ${data.universityCount}大学, 平均${Math.round(data.avgArea).toLocaleString()}${data.unit}`,
      );
    });

    // 産業分類の総合分析
    console.log('\n💼 産業分類 総合分析:');
    console.log(
      `全大学共通の産業分類数: ${this.results.industryClassifications.allClassifications.size}種類`,
    );

    const industryAnalysis = {};
    Array.from(this.results.industryClassifications.allClassifications).forEach(
      (industry) => {
        const structure =
          this.results.industryClassifications.detailedStructure[industry];
        industryAnalysis[industry] = {
          universityCount: structure.universities.size,
          departmentCount: structure.departments.size,
          totalCount: structure.counts.reduce((sum, count) => sum + count, 0),
          avgCount:
            structure.counts.reduce((sum, count) => sum + count, 0) /
            structure.counts.length,
        };
      },
    );

    const sortedIndustries = Object.entries(industryAnalysis)
      .sort(([, a], [, b]) => b.universityCount - a.universityCount)
      .slice(0, 20);

    console.log('\n共通度順 産業分類 (上位20):');
    sortedIndustries.forEach(([industry, data], index) => {
      console.log(
        `  ${index + 1}. "${industry}": ${data.universityCount}大学, 平均${Math.round(data.avgCount)}人`,
      );
    });

    // 標準化推奨案の提示
    console.log('\n💡 標準化推奨案:');
    console.log('━'.repeat(40));

    console.log('\n🏞️ 土地用途標準化案:');
    const commonLandUses = sortedLandUses.filter(
      ([, data]) => data.universityCount >= 2,
    );
    console.log(
      `  共通土地用途: ${commonLandUses.length}/${this.results.landUseTypes.allTypes.size}種類`,
    );
    console.log(
      '  標準化可能性: ' +
        (commonLandUses.length > this.results.landUseTypes.allTypes.size * 0.7
          ? '高'
          : '中'),
    );

    console.log('\n🏢 建物用途標準化案:');
    const commonBuildingUses = sortedBuildingUses.filter(
      ([, data]) => data.universityCount >= 2,
    );
    console.log(
      `  共通建物用途: ${commonBuildingUses.length}/${this.results.buildingUseTypes.allTypes.size}種類`,
    );
    console.log(
      '  標準化可能性: ' +
        (commonBuildingUses.length >
        this.results.buildingUseTypes.allTypes.size * 0.7
          ? '高'
          : '中'),
    );

    console.log('\n💼 産業分類標準化案:');
    const commonIndustries = sortedIndustries.filter(
      ([, data]) => data.universityCount >= 2,
    );
    console.log(
      `  共通産業分類: ${commonIndustries.length}/${this.results.industryClassifications.allClassifications.size}種類`,
    );
    console.log(
      '  標準化可能性: ' +
        (commonIndustries.length >
        this.results.industryClassifications.allClassifications.size * 0.3
          ? '中'
          : '低'),
    );
    console.log('  推奨: 日本標準産業分類の大分類・中分類での統一');

    return {
      landUse: {
        total: this.results.landUseTypes.allTypes.size,
        common: commonLandUses.length,
        standardizable:
          commonLandUses.length > this.results.landUseTypes.allTypes.size * 0.7,
      },
      buildingUse: {
        total: this.results.buildingUseTypes.allTypes.size,
        common: commonBuildingUses.length,
        standardizable:
          commonBuildingUses.length >
          this.results.buildingUseTypes.allTypes.size * 0.7,
      },
      industry: {
        total: this.results.industryClassifications.allClassifications.size,
        common: commonIndustries.length,
        standardizable: false, // 複雑すぎるため大分類での統一が必要
      },
    };
  }

  // 結果保存
  saveResults() {
    // Set を配列に変換
    const processedResults = {
      timestamp: new Date().toISOString(),
      universities: INVESTIGATION_UNIVERSITIES,
      landUseTypes: {
        universities: this.results.landUseTypes.universities,
        allTypes: Array.from(this.results.landUseTypes.allTypes),
        detailedStructure: {},
      },
      buildingUseTypes: {
        universities: this.results.buildingUseTypes.universities,
        allTypes: Array.from(this.results.buildingUseTypes.allTypes),
        detailedStructure: {},
      },
      industryClassifications: {
        universities: this.results.industryClassifications.universities,
        allClassifications: Array.from(
          this.results.industryClassifications.allClassifications,
        ),
        detailedStructure: {},
      },
    };

    // Set を配列に変換
    Object.entries(this.results.landUseTypes.detailedStructure).forEach(
      ([key, value]) => {
        processedResults.landUseTypes.detailedStructure[key] = {
          universities: Array.from(value.universities),
          areas: value.areas,
          unit: value.unit,
        };
      },
    );

    Object.entries(this.results.buildingUseTypes.detailedStructure).forEach(
      ([key, value]) => {
        processedResults.buildingUseTypes.detailedStructure[key] = {
          universities: Array.from(value.universities),
          areas: value.areas,
          unit: value.unit,
        };
      },
    );

    Object.entries(
      this.results.industryClassifications.detailedStructure,
    ).forEach(([key, value]) => {
      processedResults.industryClassifications.detailedStructure[key] = {
        universities: Array.from(value.universities),
        counts: value.counts,
        departments: Array.from(value.departments),
      };
    });

    fs.writeFileSync(
      'category-data-structure-investigation.json',
      JSON.stringify(processedResults, null, 2),
      'utf8',
    );
    console.log(
      '\n💾 調査結果を保存: category-data-structure-investigation.json',
    );

    return processedResults;
  }
}

// メイン実行
async function main() {
  try {
    const investigator = new CategoryDataInvestigator();
    await investigator.investigateAllUniversities();
    investigator.analyzeOverallResults();
    investigator.saveResults();

    console.log('\n🎉 カテゴリデータ構造詳細調査が完了しました！');
  } catch (error) {
    console.error('❌ 調査エラー:', error.message);
  }
}

// 実行
main();
