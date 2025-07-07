// 組織ID構造分析とクラスタリング調査プログラム
import { OrganizationIDs } from './node-portraits.js';

// 調査対象大学
const TARGET_UNIVERSITIES = [
  '大阪大学',
  '静岡大学',
  '東京大学',
  '長岡技術科学大学',
  '東北大学',
  '京都大学',
  '愛媛大学',
  'サイバー大学',
];

// 組織IDの構造を解析する関数
function parseOrganizationId(orgId) {
  // 例: 0292-27-27-1G01-00-1
  const parts = orgId.split('-');

  if (parts.length !== 6) {
    return null;
  }

  return {
    univId: parts[0], // 大学ID: 0292
    campusCode1: parts[1], // キャンパスコード1: 27
    campusCode2: parts[2], // キャンパスコード2: 27
    deptCode: parts[3], // 学部・研究科コード: 1G01
    subCode: parts[4], // サブコード: 00
    finalCode: parts[5], // 最終コード: 1

    // 学部・研究科コードをさらに分析
    level: parts[3].charAt(0), // 教育段階: 1(学部), 2(修士), 4(博士), A(専門職)
    category: parts[3].substring(1, 4), // 分野カテゴリ: G01, G02, Y03など
    subcategory: parts[3].substring(4), // サブカテゴリ: 残りの部分
  };
}

// 全組織のIDを収集・分析
function analyzeAllOrganizationIds() {
  console.log('=== 組織ID構造分析 ===\n');

  const allOrganizations = [];
  const levelAnalysis = new Map();
  const categoryAnalysis = new Map();
  const patternAnalysis = new Map();

  for (const univName of TARGET_UNIVERSITIES) {
    console.log(`━━━ ${univName} ━━━`);

    try {
      const year = 2024;
      const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(year, [univName]);
      const depts = orgIds[univName] || [];

      console.log(`組織数: ${depts.length}`);

      for (const dept of depts) {
        const parsed = parseOrganizationId(dept.ID);
        if (!parsed) continue;

        const orgInfo = {
          univ: univName,
          name: dept.DEP,
          id: dept.ID,
          parsed: parsed,
        };

        allOrganizations.push(orgInfo);

        // レベル分析
        if (!levelAnalysis.has(parsed.level)) {
          levelAnalysis.set(parsed.level, []);
        }
        levelAnalysis.get(parsed.level).push(orgInfo);

        // カテゴリ分析
        if (!categoryAnalysis.has(parsed.category)) {
          categoryAnalysis.set(parsed.category, []);
        }
        categoryAnalysis.get(parsed.category).push(orgInfo);

        // パターン分析（レベル+カテゴリ）
        const pattern = `${parsed.level}${parsed.category}`;
        if (!patternAnalysis.has(pattern)) {
          patternAnalysis.set(pattern, []);
        }
        patternAnalysis.get(pattern).push(orgInfo);
      }

      console.log('');
    } catch (error) {
      console.error(`${univName}の分析中にエラー:`, error.message);
    }
  }

  return { allOrganizations, levelAnalysis, categoryAnalysis, patternAnalysis };
}

// 教育段階レベルの分析
function analyzeLevels(levelAnalysis) {
  console.log('=== 教育段階レベル分析 ===');

  const levelMeanings = {
    1: '学部レベル',
    2: '修士レベル（博士前期）',
    4: '博士レベル（博士後期）',
    5: 'その他大学院レベル',
    A: '専門職学位レベル',
  };

  for (const [level, orgs] of levelAnalysis) {
    const meaning = levelMeanings[level] || '不明';
    console.log(`\n${level}: ${meaning} (${orgs.length}組織)`);

    // 各レベルでの代表例を表示
    const examples = orgs.slice(0, 3);
    for (const org of examples) {
      console.log(`  例: ${org.name} (${org.id})`);
    }

    if (orgs.length > 3) {
      console.log(`  ... 他${orgs.length - 3}組織`);
    }
  }
}

// カテゴリ分析
function analyzeCategories(categoryAnalysis) {
  console.log('\n=== 分野カテゴリ分析 ===');

  // カテゴリを頻度順でソート
  const sortedCategories = Array.from(categoryAnalysis.entries()).sort(
    ([, a], [, b]) => b.length - a.length,
  );

  for (const [category, orgs] of sortedCategories) {
    console.log(`\n${category}: ${orgs.length}組織`);

    // 名称パターンを分析
    const namePatterns = new Map();
    for (const org of orgs) {
      const name = org.name;
      // 共通キーワードを抽出
      const keywords = [
        '工学',
        '理学',
        '文学',
        '法学',
        '医学',
        '農学',
        '経済',
        '教育',
        '人文',
        '社会',
      ];
      for (const keyword of keywords) {
        if (name.includes(keyword)) {
          namePatterns.set(keyword, (namePatterns.get(keyword) || 0) + 1);
        }
      }
    }

    if (namePatterns.size > 0) {
      const topKeywords = Array.from(namePatterns.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
      console.log(
        `  主要分野: ${topKeywords.map(([k, c]) => `${k}(${c})`).join(', ')}`,
      );
    }

    // 代表例
    const examples = orgs.slice(0, 2);
    for (const org of examples) {
      console.log(`  例: ${org.name} (${org.univ})`);
    }
  }
}

// パターンベースクラスタリング
function performPatternClustering(patternAnalysis) {
  console.log('\n=== パターンベースクラスタリング ===');

  // パターンを頻度順でソート
  const sortedPatterns = Array.from(patternAnalysis.entries()).sort(
    ([, a], [, b]) => b.length - a.length,
  );

  const clusters = new Map();

  for (const [pattern, orgs] of sortedPatterns) {
    if (orgs.length < 2) continue; // 2つ以上の組織があるパターンのみ

    console.log(`\nパターン ${pattern}: ${orgs.length}組織`);

    // 大学間での分布を確認
    const univDistribution = new Map();
    for (const org of orgs) {
      univDistribution.set(org.univ, (univDistribution.get(org.univ) || 0) + 1);
    }

    console.log(
      `  大学分布: ${Array.from(univDistribution.entries())
        .map(([u, c]) => `${u}(${c})`)
        .join(', ')}`,
    );

    // 名称の類似性を確認
    const uniqueNames = new Set(orgs.map((org) => org.name));
    console.log(`  組織名の種類: ${uniqueNames.size}`);

    if (uniqueNames.size <= 3) {
      console.log(`  組織名: ${Array.from(uniqueNames).join(', ')}`);
    } else {
      const exampleNames = Array.from(uniqueNames).slice(0, 3);
      console.log(`  組織名例: ${exampleNames.join(', ')} ...`);
    }

    // クラスター評価
    const isGoodCluster =
      orgs.length >= 3 && // 十分な数
      univDistribution.size >= 2 && // 複数大学にまたがる
      uniqueNames.size <= orgs.length * 0.7; // 名称の重複度が高い

    if (isGoodCluster) {
      clusters.set(pattern, {
        organizations: orgs,
        score: (orgs.length * univDistribution.size) / uniqueNames.size,
        description: `${Array.from(uniqueNames).slice(0, 2).join('・')}系`,
      });
      console.log(`  ★ 良好なクラスター候補`);
    }
  }

  return clusters;
}

// 工学部特化クラスタリング
function analyzeEngineeringClusters(allOrganizations) {
  console.log('\n=== 工学部系クラスタリング詳細分析 ===');

  // 工学部関連組織を抽出
  const engineeringKeywords = [
    '工学',
    '理工',
    '技術科学',
    '情報工学',
    'システム工学',
  ];
  const engineeringOrgs = allOrganizations.filter((org) =>
    engineeringKeywords.some((keyword) => org.name.includes(keyword)),
  );

  console.log(`工学部関連組織数: ${engineeringOrgs.length}`);

  // 工学部系のパターン分析
  const engineeringPatterns = new Map();
  for (const org of engineeringOrgs) {
    const pattern = `${org.parsed.level}${org.parsed.category}`;
    if (!engineeringPatterns.has(pattern)) {
      engineeringPatterns.set(pattern, []);
    }
    engineeringPatterns.get(pattern).push(org);
  }

  console.log('\n工学部系パターン:');
  for (const [pattern, orgs] of engineeringPatterns) {
    console.log(`  ${pattern}: ${orgs.length}組織`);
    for (const org of orgs) {
      console.log(`    ${org.name} (${org.univ}) - ${org.id}`);
    }
  }

  // 工学部系クラスタリング提案
  console.log('\n工学部系クラスタリング提案:');

  const proposals = [
    {
      name: '工学部（学部レベル）',
      pattern: /^1G/,
      description: '学部段階の工学系教育組織',
    },
    {
      name: '工学研究科（修士レベル）',
      pattern: /^2G/,
      description: '修士課程の工学系研究組織',
    },
    {
      name: '工学研究科（博士レベル）',
      pattern: /^4G/,
      description: '博士課程の工学系研究組織',
    },
    {
      name: '情報系（修士レベル）',
      pattern: /^2Y/,
      description: '修士課程の情報系研究組織',
    },
    {
      name: '情報系（博士レベル）',
      pattern: /^4Y/,
      description: '博士課程の情報系研究組織',
    },
  ];

  for (const proposal of proposals) {
    const matchingOrgs = engineeringOrgs.filter((org) =>
      proposal.pattern.test(`${org.parsed.level}${org.parsed.category}`),
    );

    if (matchingOrgs.length > 0) {
      console.log(`\n${proposal.name}: ${matchingOrgs.length}組織`);
      console.log(`  定義: ${proposal.description}`);

      const univs = new Set(matchingOrgs.map((org) => org.univ));
      console.log(`  対象大学: ${Array.from(univs).join(', ')}`);

      for (const org of matchingOrgs) {
        console.log(`    ${org.name} (${org.univ})`);
      }
    }
  }
}

// 全分野クラスタリング分析
function analyzeAllFieldsClusters(allOrganizations) {
  console.log('\n=== 全分野クラスタリング詳細分析 ===');

  // 主要分野を定義
  const fieldDefinitions = [
    {
      name: '医学系',
      keywords: ['医学', '歯学', '薬学', '小児発達'],
      categoryPattern: /^(M02|M04|M05|M08|M03|M10|M48|M60)$/,
      description: '医学・歯学・薬学関連の組織',
    },
    {
      name: '理学系',
      keywords: ['理学', '数理', '生命機能'],
      categoryPattern: /^(E01|E02|E12|E19)$/,
      description: '理学・数理科学関連の組織',
    },
    {
      name: '文学・人文系',
      keywords: ['文学', '言語', '人文', '外国語'],
      categoryPattern: /^(A01|A17|A09|A05|A19)$/,
      description: '文学・言語・人文科学関連の組織',
    },
    {
      name: '法学・政治系',
      keywords: ['法学', '政治', '司法', '公共政策'],
      categoryPattern: /^(C01|C02|C05|C52|C87|C90)$/,
      description: '法学・政治学・公共政策関連の組織',
    },
    {
      name: '経済学系',
      keywords: ['経済'],
      categoryPattern: /^(C09)$/,
      description: '経済学関連の組織',
    },
    {
      name: '農学系',
      keywords: ['農学', '農業'],
      categoryPattern: /^(K01|K10|K15)$/,
      description: '農学・農業科学関連の組織',
    },
    {
      name: '教育学系',
      keywords: ['教育', '教員養成'],
      categoryPattern: /^(S01|S02)$/,
      description: '教育学・教員養成関連の組織',
    },
    {
      name: '学際・総合系',
      keywords: [
        '人間科学',
        '総合',
        '新領域',
        '情報学',
        '学際',
        '国際',
        '教養',
      ],
      categoryPattern:
        /^(X25|X26|X05|X37|X34|X55|X63|X69|X70|X81|Y70|Z33|Z73|Z57)$/,
      description: '学際的・総合的な研究・教育組織',
    },
  ];

  console.log(`対象分野数: ${fieldDefinitions.length}`);
  console.log(`総組織数: ${allOrganizations.length}\n`);

  const fieldResults = new Map();

  for (const fieldDef of fieldDefinitions) {
    console.log(`━━━ ${fieldDef.name} ━━━`);

    // キーワードベースとカテゴリパターンベースの両方で抽出
    const keywordOrgs = allOrganizations.filter((org) =>
      fieldDef.keywords.some((keyword) => org.name.includes(keyword)),
    );

    const categoryOrgs = allOrganizations.filter((org) =>
      fieldDef.categoryPattern.test(org.parsed.category),
    );

    // 重複を除去して統合
    const allFieldOrgs = Array.from(new Set([...keywordOrgs, ...categoryOrgs]));

    console.log(`  ${fieldDef.description}`);
    console.log(`  組織数: ${allFieldOrgs.length}`);

    if (allFieldOrgs.length === 0) {
      console.log('  該当組織なし\n');
      continue;
    }

    // パターン分析
    const patterns = new Map();
    for (const org of allFieldOrgs) {
      const pattern = `${org.parsed.level}${org.parsed.category}`;
      if (!patterns.has(pattern)) {
        patterns.set(pattern, []);
      }
      patterns.get(pattern).push(org);
    }

    console.log(`  パターン数: ${patterns.size}`);

    // 主要パターンを表示
    const sortedPatterns = Array.from(patterns.entries())
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5); // 上位5パターン

    for (const [pattern, orgs] of sortedPatterns) {
      console.log(`    ${pattern}: ${orgs.length}組織`);

      // 大学分布
      const univs = new Set(orgs.map((org) => org.univ));
      if (univs.size > 1) {
        console.log(`      大学分布: ${Array.from(univs).join(', ')}`);
      }

      // 代表的な組織名
      const uniqueNames = new Set(orgs.map((org) => org.name));
      if (uniqueNames.size <= 3) {
        console.log(`      組織: ${Array.from(uniqueNames).join(', ')}`);
      } else {
        const examples = Array.from(uniqueNames).slice(0, 2);
        console.log(`      組織例: ${examples.join(', ')} ...`);
      }
    }

    // 教育段階別分析
    const levelDistribution = new Map();
    for (const org of allFieldOrgs) {
      const level = org.parsed.level;
      levelDistribution.set(level, (levelDistribution.get(level) || 0) + 1);
    }

    console.log('  教育段階分布:');
    const levelNames = {
      1: '学部',
      2: '修士',
      4: '博士',
      5: 'その他院',
      6: '博士一貫',
      A: '専門職',
      C: '特殊',
      G: '特殊',
    };

    for (const [level, count] of Array.from(
      levelDistribution.entries(),
    ).sort()) {
      const levelName = levelNames[level] || level;
      console.log(`    ${levelName}: ${count}組織`);
    }

    // クラスタリング品質評価
    const clusterQuality = evaluateClusterQuality(allFieldOrgs, patterns);
    console.log(
      `  クラスタリング品質: ${clusterQuality.score.toFixed(2)} (${clusterQuality.rating})`,
    );

    fieldResults.set(fieldDef.name, {
      organizations: allFieldOrgs,
      patterns: patterns,
      quality: clusterQuality,
    });

    console.log('');
  }

  // 全体サマリー
  console.log('=== 分野別クラスタリングサマリー ===');

  const qualityRanking = Array.from(fieldResults.entries()).sort(
    ([, a], [, b]) => b.quality.score - a.quality.score,
  );

  console.log('クラスタリング品質ランキング:');
  for (let i = 0; i < qualityRanking.length; i++) {
    const [fieldName, result] = qualityRanking[i];
    console.log(
      `  ${i + 1}. ${fieldName}: ${result.quality.score.toFixed(2)} (${result.organizations.length}組織)`,
    );
  }

  // 分野横断的なパターン分析
  console.log('\n分野横断的パターン分析:');
  const crossFieldPatterns = new Map();

  for (const [fieldName, result] of fieldResults) {
    for (const [pattern, orgs] of result.patterns) {
      if (!crossFieldPatterns.has(pattern)) {
        crossFieldPatterns.set(pattern, new Map());
      }
      crossFieldPatterns.get(pattern).set(fieldName, orgs.length);
    }
  }

  // 複数分野にまたがるパターンを抽出
  const sharedPatterns = Array.from(crossFieldPatterns.entries())
    .filter(([, fields]) => fields.size >= 2)
    .sort(([, a], [, b]) => b.size - a.size)
    .slice(0, 10);

  for (const [pattern, fields] of sharedPatterns) {
    const totalOrgs = Array.from(fields.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    console.log(
      `  パターン ${pattern} (${fields.size}分野, ${totalOrgs}組織):`,
    );
    for (const [field, count] of fields) {
      console.log(`    ${field}: ${count}組織`);
    }
  }

  return fieldResults;
}

// クラスタリング品質評価関数
function evaluateClusterQuality(organizations, patterns) {
  if (organizations.length === 0) {
    return { score: 0, rating: '評価不可' };
  }

  // 評価指標
  let score = 0;

  // 1. パターンの多様性（少ないほど良い - 明確な分類）
  const patternDiversity =
    patterns.size / Math.max(organizations.length / 3, 1);
  score += Math.max(0, 3 - patternDiversity);

  // 2. 大学間での分布の均等性
  const univs = new Set(organizations.map((org) => org.univ));
  const univBalance = Math.min(univs.size, 4) / 4;
  score += univBalance * 2;

  // 3. 教育段階の分布
  const levels = new Set(organizations.map((org) => org.parsed.level));
  const levelBalance = Math.min(levels.size, 3) / 3;
  score += levelBalance * 2;

  // 4. 名称の一貫性
  const uniqueNames = new Set(organizations.map((org) => org.name));
  const nameConsistency = 1 - uniqueNames.size / organizations.length;
  score += nameConsistency * 3;

  // 評価ランク
  let rating;
  if (score >= 7) rating = '優秀';
  else if (score >= 5) rating = '良好';
  else if (score >= 3) rating = '普通';
  else rating = '要改善';

  return { score, rating };
}

// メイン実行関数
function main() {
  console.log('組織ID構造分析とクラスタリング調査を開始します...\n');

  try {
    // 全組織データの収集・分析
    const {
      allOrganizations,
      levelAnalysis,
      categoryAnalysis,
      patternAnalysis,
    } = analyzeAllOrganizationIds();

    console.log(`\n総組織数: ${allOrganizations.length}`);

    // 各種分析の実行
    analyzeLevels(levelAnalysis);
    analyzeCategories(categoryAnalysis);

    const clusters = performPatternClustering(patternAnalysis);

    console.log(`\n=== 発見されたクラスター数: ${clusters.size} ===`);
    for (const [pattern, cluster] of clusters) {
      console.log(
        `${pattern}: ${cluster.description} (スコア: ${cluster.score.toFixed(2)})`,
      );
    }

    // 工学部特化分析
    analyzeEngineeringClusters(allOrganizations);

    // 全分野のクラスタリング分析
    analyzeAllFieldsClusters(allOrganizations);

    console.log('\n=== 組織IDの意味まとめ ===');
    console.log(
      '組織ID構造: [大学ID]-[キャンパス1]-[キャンパス2]-[学部コード]-[サブコード]-[最終コード]',
    );
    console.log('例: 0292-27-27-1G01-00-1');
    console.log('  0292: 大阪大学');
    console.log('  27-27: キャンパスコード');
    console.log('  1G01: 学部レベル(1) + 工学系(G01)');
    console.log('  00-1: 詳細分類コード');

    console.log('\n学部コードの読み方:');
    console.log('  最初の数字: 1=学部, 2=修士, 4=博士, A=専門職');
    console.log('  G01/G02: 工学系（G01=工学部, G02=基礎工学部）');
    console.log('  Y03: 情報理工学系');
    console.log('  A01: 文学系, C05: 法学系, E01: 理学系 など');

    console.log('\nクラスタリング可能性:');
    console.log('  ✓ 教育段階別（学部・修士・博士）でのクラスタリング可能');
    console.log('  ✓ 分野別（工学・理学・文学など）でのクラスタリング可能');
    console.log(
      '  ✓ 組み合わせ（工学部、工学研究科など）でのクラスタリング可能',
    );
  } catch (error) {
    console.error('分析中にエラーが発生しました:', error.message);
  }

  console.log('\n分析完了！');
}

// 実行
main();
