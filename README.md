# Portraits-GAS (Node.js版)

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg?style=flat-square)](https://github.com/google/clasp) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier) [![CodeQL](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/codeql-analysis.yml) [![Deploy](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/deploy.yml/badge.svg)](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/deploy.yml) [![Lint Code Base](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/linter.yml/badge.svg)](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/linter.yml) [![coverage](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/coverage.yml/badge.svg)](https://github.com/ttsukagoshi/portraits-gas/actions/workflows/coverage.yml)

大学ポートレート Web-API https://api-portal.portraits.niad.ac.jp/ （ポートレート API）を **Node.js環境** で使うためのライブラリです。

このプロジェクトは、元々Google Apps Script（GAS）向けに開発されたライブラリをNode.js環境に移植したものです。大学および学部・研究科の組織IDをローカルCSVファイルから取得し、ポートレートAPIを呼び出すことができます。

## 目次

- [セットアップ](#セットアップ)
- [CSVデータの準備](#csvデータの準備)
- [使い方](#使い方)
  - [基本的な使用例](#基本的な使用例)
  - [ポートレート API を呼び出す](#ポートレート-api-を呼び出す)
  - [組織 ID の取得](#組織-id-の取得)
    - [大学 ID の取得](#大学-id-の取得)
    - [学部・研究科等組織 ID の取得](#学部研究科等組織-id-の取得)
  - [該当データが存在しない場合](#該当データが存在しない場合)
- [実行例](#実行例)
- [Google Apps Script版について](#google-apps-script版について)
- [告知](#告知)

## セットアップ

### 1. 必要な環境

- Node.js（バージョン14以上推奨）
- npm または yarn
- 大学ポートレートAPIのアクセスキー

### 2. ファイル構成

```
portraits-gas-test/
├── node-portraits.js       # Node.js版ライブラリ
├── example-node.js         # 使用例・テストコード
├── package.json           # ES Modules設定済み
├── Data/                  # CSVデータディレクトリ
│   ├── UnivList.csv       # 大学ID一覧
│   └── DepaList.csv       # 学部・研究科等組織ID一覧
└── README.md              # この説明書
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. アクセスキーの設定

[大学ポートレートのAPI申請ページ](https://api-portal.portraits.niad.ac.jp/)でアクセスキーを取得し、`example-node.js`の`ACCESS_KEY`変数に設定してください。

```javascript
const ACCESS_KEY = 'your-access-key-here';
```

## CSVデータの準備

このライブラリは、大学および学部・研究科の組織IDを以下のCSVファイルから読み込みます：

- `Data/UnivList.csv` - 大学ID一覧
- `Data/DepaList.csv` - 学部・研究科等組織ID一覧

これらのファイルは[大学ポートレートのAPI情報ページ](https://api-portal.portraits.niad.ac.jp/api-info.html)からダウンロードできるExcelファイルをCSV形式に変換して配置してください。

### CSVファイル形式

#### UnivList.csv

```csv
"大学ポートレート（API）",,,,,,,,,
"大学ID","学校名","2021年度","2022年度","2023年度","2024年度",...
0100,"北海道大学","○","○","○","○",...
0104,"北海道教育大学","○","○","○","○",...
...
```

#### DepaList.csv

```csv
"大学ポートレート（API）",,,,,,,,,
"年度","大学ID","学校名","学部・研究科等組織ID","学部・研究科名称",...
2024,"0100","北海道大学","0100-01-01-1K08-00-1","水産学部",...
...
```

## 使い方

### 基本的な使用例

```javascript
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';

// 大学ID一覧を取得
const allUnivs = OrganizationIDs.getAllUnivIds();
console.log(`全大学数: ${allUnivs.length}`);

// 特定大学のIDを検索
const targetUnivs = OrganizationIDs.getUnivIds(['東京大学', '京都大学']);
console.log(targetUnivs);

// APIを使用してデータを取得
const accessKey = 'your-access-key-here';
const univId = '0172'; // 東京大学
const data = await PortraitsAPI.getStudentFacultyStatus(
  accessKey,
  2024,
  univId,
);
```

### ポートレート API を呼び出す

[API の仕様](https://api-portal.portraits.niad.ac.jp/api-info.html)で定められた各エンドポイントが、そのままメソッドとして使えるようになっています。

```javascript
// 大学IDが「0172」の大学について、2024年度の学生教員等状況票情報を取得する例
const sf = await PortraitsAPI.getStudentFacultyStatus(accessKey, 2024, '0172');
```

使用できるメソッド：

- `getStudentFacultyStatus()` - 学生教員等状況票
- `getCollegeUndergraduateStudentsDetail()` - 学部学生内訳票
- `getGraduateStudentsDetail()` - 大学院学生内訳票
- `getJuniorCollegeUndergraduateStudentsDetail()` - 本科学生内訳票
- `getForeignStudent()` - 外国人学生調査票
- `getStatusAfterGraduationGraduates()` - 卒業後の状況調査票(2-1)
- `getStatusAfterGraduationJobs()` - 卒業後の状況調査票(2-2)
- `getSchoolFacilities()` - 学校施設調査票

### 組織 ID の取得

#### 大学 ID の取得

```javascript
// 全大学のID一覧を取得
const allUnivIds = OrganizationIDs.getAllUnivIds();

// 特定大学のIDを検索
const targetUnivs = ['東京大学', '京都大学'];
const specificUnivs = OrganizationIDs.getUnivIds(targetUnivs);
specificUnivs.forEach((univ) => {
  console.log(`${univ.UNIV_NAME}: ${univ.UNIV_ID}`);
});
```

戻り値は以下のような形式です：

```javascript
[
  {
    UNIV_ID: '0172',
    UNIV_NAME: '東京大学',
  },
  {
    UNIV_ID: '0280',
    UNIV_NAME: '京都大学',
  },
];
```

#### 学部・研究科等組織 ID の取得

```javascript
// 指定年度・大学の学部・研究科ID一覧を取得
const orgIds = OrganizationIDs.getOrganizationIdsbyUniv(2024, ['北海道大学']);
console.log(orgIds);

// 特定学部・研究科を検索
const deptIds = OrganizationIDs.searchDepartmentIds(2024, '京都大学', '文学部');
console.log(deptIds);
```

戻り値は以下のような形式です：

```javascript
{
  "北海道大学": [
    {
      "ID": "0100-01-01-1K08-00-1",
      "DEP": "水産学部"
    },
    {
      "ID": "0100-01-01-2K28-02-1",
      "DEP": "水産科学院"
    }
    // ...
  ]
}
```

### 該当データが存在しない場合

API レスポンスの `GET_STATUS_LIST.RESULT.STATUS` 値で判定できます：

```javascript
const response = await PortraitsAPI.getStudentFacultyStatus(
  accessKey,
  2024,
  univId,
);
if (response.GET_STATUS_LIST.RESULT.STATUS === '0') {
  // 該当データが存在する場合の処理
  console.log('データ取得成功');
} else {
  // 該当データが存在しない場合の処理
  console.log('該当データなし:', response.GET_STATUS_LIST.RESULT.ERROR_MSG);
}
```

## 詳細な利用方法

### カスタムスクリプトの作成

`node-portraits.js` からライブラリをインポートして独自のスクリプトを作成できます：

```javascript
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';

async function myScript() {
  const ACCESS_KEY = 'your_access_key_here';

  try {
    // 学生教員等状況票の取得
    const result = await PortraitsAPI.getStudentFacultyStatus(
      ACCESS_KEY,
      2024,
      '0172', // 東京大学のID
    );

    console.log(result);
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

myScript();
```

### 利用可能なAPIメソッド詳細

```javascript
// 学生教員等状況票
await PortraitsAPI.getStudentFacultyStatus(accessKey, year, univId);

// 学部学生内訳票
await PortraitsAPI.getCollegeUndergraduateStudentsDetail(
  accessKey,
  year,
  orgId,
);

// 大学院学生内訳票
await PortraitsAPI.getGraduateStudentsDetail(accessKey, year, orgId);

// 本科学生内訳票
await PortraitsAPI.getJuniorCollegeUndergraduateStudentsDetail(
  accessKey,
  year,
  univId,
);

// 外国人学生調査票
await PortraitsAPI.getForeignStudent(accessKey, year, foreignId);

// 卒業後の状況調査票(2-1)
await PortraitsAPI.getStatusAfterGraduationGraduates(accessKey, year, orgId);

// 卒業後の状況調査票(2-2)
await PortraitsAPI.getStatusAfterGraduationJobs(accessKey, year, orgId);

// 学校施設調査票
await PortraitsAPI.getSchoolFacilities(accessKey, year, univId);
```

### エラーハンドリング

APIの応答には以下の形式でステータスが含まれます：

```javascript
const result = await PortraitsAPI.getStudentFacultyStatus(
  accessKey,
  year,
  univId,
);

if (result.GET_STATUS_LIST.RESULT.STATUS === '0') {
  // データが正常に取得された場合
  console.log('データ取得成功');
  const dataList = result.GET_STATUS_LIST.DATALIST_INF.DATA_INF;
  // データの処理...
} else {
  // データが存在しない場合
  console.log('該当データなし:', result.GET_STATUS_LIST.RESULT.ERROR_MSG);
}
```

## 実行例

テスト用のサンプルコードが `example-node.js` に用意されています：

```bash
node example-node.js
```

このサンプルでは以下の機能をテストできます：

1. 大学ID一覧の取得（208大学）
2. 特定大学のID検索（東京大学、京都大学）
3. 学部・研究科等組織IDの取得（北海道大学の137学部・研究科）
4. 学部・研究科名による検索（京都大学文学部）
5. API呼び出し（東京大学の学生教員等状況票など）

実行結果例：

```
=== Node.js環境でのPortraits API使用例 ===

1. 大学ID一覧の取得:
  全大学数: 208
  最初の3大学:
    ID: 0100, 名前: 北海道大学
    ID: 0104, 名前: 北海道教育大学
    ID: 0108, 名前: 室蘭工業大学

2. 特定大学のIDを検索:
  東京大学: 0172
  京都大学: 0280

3. API呼び出し例:
  大学ID 0172 の2024年度学生教員等状況票を取得中...
  取得成功!
  === データサマリー ===
  大学名: 東京大学
  所在地: 文京区本郷７－３－１
  学生総数: 29482人（男性21921人、女性7561人）
  教員総数: 3961人（男性3317人、女性644人）
  職員総数: 4289人（男性1506人、女性2783人）
```

## 注意事項とトラブルシューティング

### 重要な注意事項

1. **レート制限**: APIには利用制限がある可能性があります。大量のリクエストを送信する際は適切な間隔を空けてください。

2. **アクセスキーの管理**: アクセスキーは機密情報です。公開リポジトリにコミットしないよう注意してください。

3. **年度の指定**: APIでは2021年度以降のデータのみ利用可能です。

4. **CSVファイル**: 組織ID検索機能を使用する場合は、適切な形式の `Data/UnivList.csv` および `Data/DepaList.csv` ファイルが必要です。

### よくあるエラーと対処法

#### 1. SyntaxError: Cannot use import statement outside a module

**原因**: ES Modulesが正しく設定されていない

**対処法**: `package.json` に `"type": "module"` が設定されているか確認してください

#### 2. アクセスキーエラー

**原因**: 無効または期限切れのアクセスキー

**対処法**:

- アクセスキーが正しく設定されているか確認
- アクセスキーの有効期限が切れていないか確認
- 大学ポートレートのポータルサイトでキーの状態を確認

#### 3. ネットワークエラー

**原因**: インターネット接続またはファイアウォールの問題

**対処法**:

- インターネット接続を確認
- ファイアウォールの設定を確認
- プロキシ設定が必要な場合は適切に設定

#### 4. CSVファイル読み込みエラー

**原因**: CSVファイルが存在しないまたは形式が不正

**対処法**:

- `Data/UnivList.csv` および `Data/DepaList.csv` が存在することを確認
- CSVファイルの形式が正しいことを確認（ヘッダー行の確認）

### 開発・テスト

```bash
# ESLintでコード品質チェック
npx eslint .

# Prettierでコードフォーマット
npx prettier --write .
```

## Google Apps Script版について

このプロジェクトは元々Google Apps Script（GAS）向けに開発されたライブラリのNode.js移植版です。

GAS版のライブラリをお探しの場合は、以下の手順でご利用いただけます：

1. GAS スクリプトエディターの編集画面左側にある「ライブラリ」の「＋」をクリック
2. スクリプト ID `1463IXI3rMb1b76Iwbm-jhuAiondvoDESz0FRPrOvi817HuKNnNJcfYhg` を入力して「検索」
3. 最新のバージョンを選んで「追加」

詳細は[レファレンス](REFERENCE.md)をご覧ください。

## 告知

この Node.js ライブラリは、独立行政法人大学改革支援・学位授与機構（NIAD）が運用する大学ポートレートの Web-API 機能を使用していますが、本ライブラリの開発は、NIAD と関係のない[Taro Tsukagoshi](https://github.com/ttsukagoshi)によって管理・更新されています。[大学ポートレートの Web-API 機能利用規約](https://api-portal.portraits.niad.ac.jp/agreement.html)および[本ライブラリのライセンス](LICENSE)に同意した上で利用してください。
