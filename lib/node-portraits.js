// Node.js環境用 Portraits-GAS ライブラリ
import https from 'https';
import fs from 'fs';

// APIの基本設定
const API_BASE_URL = 'https://edit.portraits.niad.ac.jp/api/';
const API_VERSION = 'v1';

// HTTPSリクエストを送信する関数
function fetchData(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`JSONの解析に失敗しました: ${error.message}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('リクエストがタイムアウトしました'));
    });
  });
}

// アクセスキーの検証
function verifyAccessKey(accessKey) {
  if (!accessKey) {
    throw new Error(
      '[ERROR] アクセスキーが空白のままAPIを呼び出そうとしています。必ずポートレートAPIのアクセスキーを設定した上で、実行してください。',
    );
  }
  if (accessKey.match(/^[^:/@]+?$/)) {
    return accessKey;
  } else {
    throw new RangeError(
      '[ERROR] 引数として渡されたアクセスキーが所定の形式でないようです。入力値をご確認ください。',
    );
  }
}

// Portraits API メソッド群
export const PortraitsAPI = {
  /**
   * 学生教員等状況票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} univId 4桁の大学ID
   * @returns {Promise<*>}
   */
  async getStudentFacultyStatus(accessKey, year, univId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${univId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getStudentFacultyStatus?${params}`;
    return await fetchData(url);
  },

  /**
   * 学部学生内訳票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} orgId 学部・研究科等組織ID
   * @returns {Promise<*>}
   */
  async getCollegeUndergraduateStudentsDetail(accessKey, year, orgId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${orgId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getCollegeUndergraduateStudentsDetail?${params}`;
    return await fetchData(url);
  },

  /**
   * 大学院学生内訳票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} orgId 学部・研究科等組織ID
   * @returns {Promise<*>}
   */
  async getGraduateStudentsDetail(accessKey, year, orgId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${orgId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getGraduateStudentsDetail?${params}`;
    return await fetchData(url);
  },

  /**
   * 本科学生内訳票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} univId 4桁の大学ID
   * @returns {Promise<*>}
   */
  async getJuniorCollegeUndergraduateStudentsDetail(accessKey, year, univId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${univId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getJuniorCollegeUndergraduateStudentsDetail?${params}`;
    return await fetchData(url);
  },

  /**
   * 外国人学生調査票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} foreignId 外国人学生用組織ID
   * @returns {Promise<*>}
   */
  async getForeignStudent(accessKey, year, foreignId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${foreignId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getForeignStudent?${params}`;
    return await fetchData(url);
  },

  /**
   * 卒業後の状況調査票(2-1)API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} orgId 学部・研究科等組織ID
   * @returns {Promise<*>}
   */
  async getStatusAfterGraduationGraduates(accessKey, year, orgId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${orgId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getStatusAfterGraduationGraduates?${params}`;
    return await fetchData(url);
  },

  /**
   * 卒業後の状況調査票(2-2)API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} orgId 学部・研究科等組織ID
   * @returns {Promise<*>}
   */
  async getStatusAfterGraduationJobs(accessKey, year, orgId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${orgId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getStatusAfterGraduationJobs?${params}`;
    return await fetchData(url);
  },

  /**
   * 学校施設調査票API情報取得
   * @param {string} accessKey APIアクセスキー
   * @param {number} year 対象年度の西暦4桁
   * @param {string} univId 4桁の大学ID
   * @returns {Promise<*>}
   */
  async getSchoolFacilities(accessKey, year, univId) {
    const params = `accesskey=${verifyAccessKey(accessKey)}&year=${year}&orgid=${univId}`;
    const url = `${API_BASE_URL}${API_VERSION}/SchoolBasicSurvey/getSchoolFacilities?${params}`;
    return await fetchData(url);
  },
};

// 組織IDデータを読み込む関数（ローカルファイルから）
function loadOrganizationData() {
  const result = {
    univIds: null,
    intlIdSuffixes: null, // UnivList.csv にはこの情報がないため null のまま
    organizationIds: null,
  };

  try {
    const depaListCsv = fs.readFileSync('./Data/DepaList.csv', 'utf8');
    const depaLines = depaListCsv.split('\n');
    // 1行目はタイトル行、2行目をヘッダーとして使用
    if (depaLines.length > 1) {
      const depaHeaders = depaLines[1].split(',');
      const depaJsonData = [];
      for (let i = 2; i < depaLines.length; i++) {
        const values = depaLines[i].split(',');
        if (values.length === depaHeaders.length) {
          const entry = {};
          for (let j = 0; j < depaHeaders.length; j++) {
            entry[depaHeaders[j].trim()] = values[j].trim();
          }
          depaJsonData.push(entry);
        }
      }
      result.organizationIds = depaJsonData;
    } else {
      console.warn('Data/DepaList.csv の内容が不正です。');
    }
  } catch (error) {
    console.warn(
      'Data/DepaList.csvファイルが見つからないか、処理中にエラーが発生しました。学部・研究科等組織ID取得機能は利用できません。',
      error,
    );
  }

  try {
    const univListCsv = fs.readFileSync('./Data/UnivList.csv', 'utf8');
    const univLines = univListCsv.split('\n');
    // 1行目はタイトル行、2行目をヘッダーとして使用
    if (univLines.length > 1) {
      const univHeaders = univLines[1].split(',');
      const univJsonData = [];
      // '大学ID' と '学校名' のインデックスを取得
      const univIdIndex = univHeaders.findIndex((h) => h.trim() === '大学ID');
      const univNameIndex = univHeaders.findIndex((h) => h.trim() === '学校名');

      if (univIdIndex !== -1 && univNameIndex !== -1) {
        for (let i = 2; i < univLines.length; i++) {
          const values = univLines[i].split(',');
          if (
            values.length >= Math.max(univIdIndex, univNameIndex) + 1 &&
            values[univIdIndex] &&
            values[univNameIndex]
          ) {
            // 年度ごとの参加状況をチェック (例: 2024年度) - CSVの列構造に依存
            // 簡単のため、ここでは年度チェックを省略し、IDと名前があれば追加
            if (values[univIdIndex].trim() && values[univNameIndex].trim()) {
              univJsonData.push({
                UNIV_ID: values[univIdIndex].trim(),
                UNIV_NAME: values[univNameIndex].trim(),
              });
            }
          }
        }
        result.univIds = univJsonData;
      } else {
        console.warn(
          'Data/UnivList.csv のヘッダーに "大学ID" または "学校名" が見つかりません。',
        );
      }
    } else {
      console.warn('Data/UnivList.csv の内容が不正です。');
    }
  } catch (error) {
    console.warn(
      'Data/UnivList.csvファイルが見つからないか、処理中にエラーが発生しました。大学ID取得機能は利用できません。',
      error,
    );
  }
  return result;
}

// 組織ID管理クラス
export const OrganizationIDs = {
  /**
   * 全ての大学ID一覧を取得（ローカルファイルから）
   * @returns {array|null}
   */
  getAllUnivIds() {
    const data = loadOrganizationData();
    return data ? data.univIds : null;
  },

  /**
   * 指定した大学のIDを取得
   * @param {array} targetUnivNames 大学名の配列
   * @returns {array} 指定した大学について、大学名とIDがセットになったオブジェクトの配列
   */
  getUnivIds(targetUnivNames) {
    const univIds = this.getAllUnivIds();
    if (!univIds) {
      throw new Error('大学IDデータが読み込めません');
    }

    const univNameList = univIds.map((univ) => univ.UNIV_NAME);
    targetUnivNames.forEach((targetUnivName) => {
      if (!univNameList.includes(targetUnivName)) {
        throw new RangeError(
          `[ERROR] ${targetUnivName} の情報は登録されていません。`,
        );
      }
    });
    return univIds.filter((univ) => targetUnivNames.includes(univ.UNIV_NAME));
  },

  /**
   * 外国人用組織ID用の所属課程分類ID一覧を取得
   * @returns {array|null}
   */
  getAllIntlIdSuffixes() {
    // const data = loadOrganizationData();
    // return data ? data.intlIdSuffixes : null;
    throw new Error(
      'この機能は現在Data/UnivList.csvに該当情報がないため利用できません。',
    );
  },

  /**
   * 指定した大学IDの外国人用組織ID一式を取得
   * @param {array} _targetUnivIds 指定する大学IDの配列 (現在は未実装)
   * @returns {array} 大学IDごとに外国人用組織ID一式を格納した二次元配列
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getIntlIds(_targetUnivIds) {
    // const intlIdSuffixes = this.getAllIntlIdSuffixes();
    // if (!intlIdSuffixes) {
    //   throw new Error('外国人用組織IDデータが読み込めません');
    // }

    // return targetUnivIds.map((targetUnivId) =>
    //   intlIdSuffixes.map(
    //     (intlIdSuffix) => targetUnivId + intlIdSuffix.INTL_ID_SUFFIX,
    //   ),
    // );
    throw new Error(
      'この機能は現在Data/UnivList.csvに該当情報がないため利用できません。',
    );
  },

  /**
   * 全ての学部・研究科等組織ID一覧を取得
   * @returns {object|null}
   */
  getAllOrganizationIds() {
    const data = loadOrganizationData();
    return data ? data.organizationIds : null;
  },

  /**
   * 指定した年度・大学の学部・研究科等組織ID一覧を取得
   * @param {number} _targetYear 取得したい年度 (この実装では未使用)
   * @param {array} targetUnivNames 大学名の配列
   * @returns {object} 大学ごとの学部・研究科等組織ID
   */
  // eslint-disable-next-line no-unused-vars
  getOrganizationIdsbyUniv(_targetYear, targetUnivNames) {
    const allOrgIdsArray = this.getAllOrganizationIds(); // これはJSONオブジェクトの配列
    if (!allOrgIdsArray) {
      throw new Error('学部・研究科等組織IDデータが読み込めません');
    }

    const orgIdsObj = {};
    targetUnivNames.forEach((targetUnivName) => {
      const univDepts = allOrgIdsArray.filter(
        (dept) => dept['学校名'] === targetUnivName,
      );
      if (univDepts.length === 0) {
        // console.warn(`[WARN] ${targetUnivName}の情報は見つかりませんでした。`);
        orgIdsObj[targetUnivName] = []; // 見つからない場合は空の配列
      } else {
        orgIdsObj[targetUnivName] = univDepts.map((dept) => ({
          ID: dept['学部・研究科等組織ID'],
          DEP: dept['学部・研究科名称'],
        }));
      }
    });
    return orgIdsObj;
  },

  /**
   * 指定した大学の特定学部・研究科のIDを検索
   * @param {number} year 年度
   * @param {string} univName 大学名
   * @param {string} deptName 学部・研究科名（部分一致）
   * @returns {array} 該当する学部・研究科のID一覧
   */
  searchDepartmentIds(year, univName, deptName) {
    const orgIdsByUniv = this.getOrganizationIdsbyUniv(year, [univName]);
    const univDepts = orgIdsByUniv[univName];

    if (!univDepts || univDepts.length === 0) {
      return [];
    }
    return univDepts.filter((dept) => dept.DEP.includes(deptName));
  },
};

export default PortraitsAPI;
