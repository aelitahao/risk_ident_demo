# 慢性病风险识别 Demo

## 1. 当前目标

平台使用同一份用户健康信息进行糖尿病和高血压风险预测。用户信息有两个入口：

1. **数据库入口**：展示数据库中的全部用户及健康画像；点击用户后生成个人风险预测。
2. **问卷入口**：用户在界面填写个人信息问卷；提交后生成个人风险预测。

两个入口只负责取得数据，不各自实现预测逻辑。数据进入预测服务前必须转换为相同的标准输入。

```text
数据库用户 ─┐
            ├─> 标准用户信息（PredictionInput） ─> 同一预测服务 ─> 风险结果
问卷提交   ─┘
```

两个入口均已上线，共用同一 `predict(input, { mode })` 服务、同一 `PredictionInput` 契约与同一结果组件。

## 2. 当前功能

### 2.1 用户列表

- 显示数据库中的全部用户；
- 支持按用户 ID 搜索；
- 每行显示用户 ID、年龄、性别、BMI、腰围、生活方式摘要和数据状态；
- 点击用户进入个人详情。

### 2.2 用户详情与画像

画像统一分为三组：

- 基本信息：年龄、性别、身高、体重、BMI、腰围等；
- 生活方式：吸烟、饮酒、活动、久坐、睡眠和单日 24 小时膳食回顾；
- 健康史：其他已知疾病、家族史、症状、心理状态和一般健康指标。

详情页提供「评估模式切换」（`lifestyle_screening` / `comprehensive_profile`）与「风险预测」操作。当前同时预测糖尿病和高血压，不要求用户单独选择疾病。

### 2.3 风险结果

结果以一份用户级报告展示：

- 当前评估模式（`mode`）；
- 糖尿病风险等级；
- 高血压风险等级；
- 筛查优先级；
- 证据状态；证据有限时列出兜底路径的缺失字段清单（`missingEvidenceFields`）；
- 主要风险因素与保护因素；
- 若命中预生成解释卡，则同时展示整体总结与每个风险/保护因素的解释文本；
- 必要的结果边界说明；
- 当请求 `comprehensive_profile` 但用户的风险卡未覆盖该模式时，响应带 `modeFallback: true` 并回退到 `lifestyle_screening`。

Demo 结果用于风险筛查展示，不代表患病概率或临床诊断。界面不展示内部评分、模型权重和源数据记录标识。

### 2.4 问卷入口

- 页面路径 `/#/questionnaire`，无需登录、无 `userId`；
- 表单字段严格对齐 §3.1 校验表；不设血压、HbA1c、空腹血糖等目标泄漏字段的输入框；
- 支持与数据库入口同一套评估模式切换；
- 校验失败时按 `INVALID_INPUT.details[].field` 高亮对应输入框并给出错误原因；
- 结果卡与数据库详情页复用同一组件。

## 3. 统一用户信息

数据库记录和问卷提交必须映射为同一个 `PredictionInput`。模型只接收该结构，不感知数据来自哪个入口。

```ts
interface PredictionInput {
  userId?: string; // 数据库用户有值；匿名问卷可为空
  basicInfo: {
    ageYears: number;
    gender: string;
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
    waistCm: number | null;
  };
  lifestyle: {
    smokingStatus: string | null;
    alcoholSummary: string | null;
    physicalActivitySummary: string | null;
    sedentaryMinutesPerDay: number | null;
    weekdaySleepHours: number | null;
    weekendSleepHours: number | null;
    dietaryRecord: Record<string, unknown> | null;
  };
  healthHistory: {
    knownDiseases: string[];
    familyHistory: Record<string, unknown>;
    currentSymptoms: string[];
    generalIndicators: Record<string, unknown>;
  };
  featureSchemaVersion: '1.0';
}
```

约束：

- 两个入口使用相同字段定义、单位、枚举值和缺失值规则；
- 数据库适配器负责把用户记录转换为 `PredictionInput`；
- 问卷接口直接接收同等信息并执行相同校验；
- 缺失字段使用 `null` 或空数组，不用猜测值补齐；
- 当前 Demo 不将糖尿病/高血压诊断、血压、HbA1c 或空腹血糖作为模型输入，避免目标信息泄漏。

### 3.1 字段校验规则

| 字段 | 类型 / 单位 | 允许值 / 范围 | 缺失表示 |
|---|---|---|---|
| `userId` | string | 非空字符串；匿名问卷缺省 | 省略或 `null` |
| `basicInfo.ageYears` | int | 18 – 120 | 必填 |
| `basicInfo.gender` | enum | `male` \| `female` \| `other` | 必填 |
| `basicInfo.heightCm` | number | 100 – 250 | `null` |
| `basicInfo.weightKg` | number | 25 – 300 | `null` |
| `basicInfo.bmi` | number | 10 – 80；可由身高体重推导 | `null` |
| `basicInfo.waistCm` | number | 40 – 200 | `null` |
| `lifestyle.smokingStatus` | enum | `never` \| `former` \| `current` | `null` |
| `lifestyle.alcoholSummary` | string | 自由文本，≤ 200 字符 | `null` |
| `lifestyle.physicalActivitySummary` | string | 自由文本，≤ 200 字符 | `null` |
| `lifestyle.sedentaryMinutesPerDay` | int | 0 – 1440 | `null` |
| `lifestyle.weekdaySleepHours` | number | 0 – 24 | `null` |
| `lifestyle.weekendSleepHours` | number | 0 – 24 | `null` |
| `lifestyle.dietaryRecord` | object | 24 小时膳食回顾，结构不约束 | `null` |
| `healthHistory.knownDiseases` | string[] | ICD-10 或受控词表 | `[]` |
| `healthHistory.familyHistory` | object | 结构不约束 | `{}` |
| `healthHistory.currentSymptoms` | string[] | 受控词表 | `[]` |
| `healthHistory.generalIndicators` | object | 结构不约束；禁止包含血压、HbA1c、空腹血糖 | `{}` |
| `featureSchemaVersion` | string | 当前固定 `"1.0"` | 必填 |

校验失败时返回 `400`（见 5.3）。

## 4. 最小系统结构

```text
risk_ident_demo/
├─ PROJECT.md                # 当前项目说明与接口约定
└─ data/
   ├─ demo/                  # 页面演示数据
   │  ├─ user_profiles.json
   │  ├─ risk_results.json
   │  └─ risk_explanations.json
   └─ source/                # 原始及建模准备数据，前端不直接读取
      ├─ brfss_1990_2024_strict_v2_harmonized.csv.gz
      ├─ model_ready_encoding_dictionary.csv
      ├─ nhanes_all_cycles_model_ready.csv
      └─ strict_v2_final_data_dictionary.csv
```

应用代码落地时建议只保留三个业务模块：

```text
users       用户查询与画像
prediction  统一输入转换、校验和模型调用
results     风险结果展示
```

不为数据库入口和问卷入口分别建立模型模块。

### 本地运行

项目只依赖 Node.js 20 及以上版本，无需安装第三方包：

```bash
npm start
```

浏览器访问 `http://localhost:3000`。运行自动化测试：

```bash
npm test
```

## 5. API

### 5.1 当前实现

```http
GET  /api/v1/users
GET  /api/v1/users/{userId}
POST /api/v1/users/{userId}/prediction
POST /api/v1/predictions
```

`POST /users/{userId}/prediction` 的处理过程：读取用户、映射为 `PredictionInput`、调用统一预测服务、返回结果。可选请求体 `{ "mode": "lifestyle_screening" | "comprehensive_profile" }`（默认 `lifestyle_screening`）。

响应结构：

```ts
// GET /api/v1/users
interface UserListResponse {
  total: number;
  users: Array<{
    userId: string;
    ageYears: number;
    gender: string;
    bmi: number | null;
    waistCm: number | null;
    lifestyleSummary: string;   // 生活方式摘要，用于列表展示
    dataStatus: 'complete' | 'partial' | 'sparse';
  }>;
}

// GET /api/v1/users/{userId}
interface UserDetailResponse {
  userId: string;
  profile: PredictionInput;      // 与统一输入契约相同
  dataStatus: 'complete' | 'partial' | 'sparse';
}

// POST /api/v1/users/{userId}/prediction
// 返回 PredictionResult（见 5.2）
```

### 5.2 问卷接口

```http
POST /api/v1/predictions
Content-Type: application/json

{
  "input": { "...": "PredictionInput" },
  "source": "questionnaire",
  "mode": "lifestyle_screening"
}
```

数据库入口也可以在应用内部调用同一预测服务。`source` 仅用于追踪，不参与模型计算。`mode` 可选，默认 `lifestyle_screening`。

匿名问卷示例（无 `userId`）：

```json
{
  "input": {
    "basicInfo": { "ageYears": 42, "gender": "female", "heightCm": 165, "weightKg": 68, "bmi": 25.0, "waistCm": 82 },
    "lifestyle": { "smokingStatus": "never", "alcoholSummary": null, "physicalActivitySummary": "每周步行 3 次", "sedentaryMinutesPerDay": 480, "weekdaySleepHours": 6.5, "weekendSleepHours": 8, "dietaryRecord": null },
    "healthHistory": { "knownDiseases": [], "familyHistory": { "diabetes": "mother" }, "currentSymptoms": [], "generalIndicators": {} },
    "featureSchemaVersion": "1.0"
  },
  "source": "questionnaire",
  "mode": "comprehensive_profile"
}
```

对应响应中 `userId` 为 `null`，`predictionId` 正常返回。

统一响应：

```ts
interface PredictionResult {
  predictionId: string;
  userId: string | null;
  modelVersion: string;
  featureSchemaVersion: string;
  mode: 'lifestyle_screening' | 'comprehensive_profile';
  modeFallback?: true;                // 请求 comprehensive_profile 但风险卡缺该模式时出现
  overallSummary?: string;             // 命中预生成解释卡时出现
  diseases: Array<{
    diseaseId: 'diabetes' | 'hypertension';
    riskLevel: 'low' | 'medium' | 'high';
    screeningPriority: 'monitor' | 'routine' | 'priority';
    evidenceLevel: 'sufficient' | 'limited';
    riskFactors: Array<{ id: string; label: string; evidence: string }>;
    protectiveFactors: Array<{ id: string; label: string; evidence: string }>;
    missingEvidenceFields?: string[];  // 仅兜底路径 limited 时出现，如 'basicInfo.bmi'
    explanation?: {                    // 仅命中预生成解释卡时出现
      riskConclusion?: string;
      mainFactorExplanations?: Array<{ factorId: string; explanation: string }>;
      protectiveFactorExplanations?: Array<{ factorId: string; explanation: string }>;
    };
  }>;
  boundaryNote: string;
}
```

### 5.3 错误响应

所有接口在异常时返回统一结构：

```ts
interface ErrorResponse {
  error: {
    code: string;      // 见下表
    message: string;   // 面向调用方的可读描述
    details?: Array<{ field: string; reason: string }>; // 仅校验错误时出现
  };
}
```

| HTTP 状态 | `code` | 触发条件 |
|---|---|---|
| 400 | `INVALID_INPUT` | `PredictionInput` 字段缺失、超出范围、枚举值非法；或 `mode` 非法枚举 |
| 400 | `SCHEMA_VERSION_UNSUPPORTED` | `featureSchemaVersion` 非 `"1.0"` |
| 404 | `USER_NOT_FOUND` | `GET /users/{userId}` 或 `POST /users/{userId}/prediction` 的用户不存在 |
| 422 | `TARGET_LEAKAGE` | `generalIndicators` 中出现禁止字段（血压、HbA1c、空腹血糖） |
| 500 | `INTERNAL_ERROR` | 未预期的服务端错误 |

## 6. 数据与调用关系

当前演示数据位于 `data/demo/`，三份文件通过 `user_id` 一一关联：

| 文件 | 内容 |
|---|---|
| `user_profiles.json` | 24 名匿名用户的基本信息、生活方式、健康史和数据状态 |
| `risk_results.json` | 预生成的糖尿病、高血压风险结果，覆盖 `lifestyle_screening` 与 `comprehensive_profile` 两种模式 |
| `risk_explanations.json` | 基于既有风险结果生成的说明文本（整体总结 + 分疾病风险因素解释），同样覆盖两种模式 |

预测服务按请求的 `mode` 读取对应节点并挂载解释；缺失模式节点时显式回退到 `lifestyle_screening` 并在响应加 `modeFallback: true`。后续接入真实模型时，只替换预测服务实现，不改变页面输入和响应结构。

## 7. 页面范围

```text
/#/users              用户列表
/#/users/:userId      用户画像、模式切换与风险预测结果
/#/questionnaire      匿名问卷录入与风险预测结果
```

三条路由复用同一结果组件，问卷入口不引入独立结果视图，也不引入独立预测逻辑。

## 8. 验收标准

| # | 标准 | 对应测试 |
|---|---|---|
| 1 | 能显示 24 名数据库用户并按用户 ID 搜索 | `users.list.test`、`users.search.test` |
| 2 | 点击任一用户能查看完整、结构一致的健康画像 | `users.detail.test` |
| 3 | 点击"风险预测"能得到糖尿病和高血压的统一结果 | `prediction.dual_disease.test` |
| 4 | 预测结果与当前 Demo 数据一致，且不显示内部评分 | `prediction.demo_consistency.test`、`prediction.no_internal_score.test` |
| 5 | 数据缺失时明确显示证据有限，不补造用户信息 | `prediction.evidence_limited.test`、`prediction.missing_evidence_fields.test` |
| 6 | 数据库输入先转换为 `PredictionInput`，再调用统一预测服务 | `prediction.input_mapping.test` |
| 7 | `POST /api/v1/predictions` 契约保留并使用同一 `PredictionInput` | `prediction.questionnaire_contract.test` |
| 8 | 未来接入问卷页面或真实模型时，无需复制预测逻辑和结果页面 | `prediction.service_singleton.test` |
| 9 | 校验失败、用户不存在、目标信息泄漏返回 5.3 规定的错误码 | `api.error_response.test` |
| 10 | 兜底引擎对糖尿病与高血压独立评分 | `prediction.engine_per_disease.test` |
| 11 | 命中预生成解释卡的用户返回整体总结与因子级解释；`factor_id` 与风险因素不匹配时不呈现 | `prediction.explanation_attached.test`、`prediction.explanation_grounding.test`、`prediction.explanation_missing.test` |
| 12 | `comprehensive_profile` 模式返回不同风险因素集合；非法 `mode` 返回 `INVALID_INPUT` | `prediction.mode_comprehensive.test`、`prediction.mode_validation.test` |

## 9. 暂不实现

- 真实模型训练、概率校准和临床诊断功能；
- 在线大模型解释（当前仅使用预生成文本）；
- EHR 接入与多用户账号、鉴权；
- 移动端专属适配；
- `data/source/` 原始数据进入运行时。
