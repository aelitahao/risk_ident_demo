# 慢性病风险识别 Demo

一个使用原生 Node.js 构建的慢性病风险筛查演示系统。系统基于同一份用户健康信息，同时生成糖尿病和高血压风险结果，并展示筛查优先级、证据状态、主要风险因素和保护因素。

> 本项目仅用于产品和技术演示。输出结果不代表患病概率、未来发病预测或临床诊断，不能替代专业医疗意见。

## 主要功能

- 展示 24 名匿名用户的健康画像；
- 支持按用户 ID 搜索；
- 查看基本信息、生活方式和健康史；
- 同时生成糖尿病与高血压风险结果；
- 展示低、中、高风险等级及筛查优先级；
- 数据不足时明确标记「证据有限」，并列出缺失字段清单；
- 支持数据库用户和问卷两种预测入口；
- 对外响应隐藏内部评分和模型权重；
- 阻止血压、HbA1c、空腹血糖等目标泄漏字段进入预测；
- 预测模型可插拔替换（回归模型 / LLM）。

## 技术特点

- Node.js 20+，ES Modules
- 原生 `node:http` HTTP 服务
- 原生 HTML、CSS 和 JavaScript
- 原生 `node:test` 自动化测试
- 运行时依赖：`openai`（仅 LLM 模式需要）

## 快速开始

### 环境要求

- Node.js 20 或更高版本

### 启动项目

```bash
npm start
```

默认访问地址：`http://localhost:3000`

可以使用 `PORT` 环境变量修改监听端口：

```powershell
$env:PORT = 8080; npm start
```

### 切换预测模型

```bash
# 默认：回归模型（即时响应，无需网络）
npm start

# LLM 模型（DeepSeek，需要 API Key）
$env:PREDICTION_MODEL="llm"; npm start
```

LLM 相关环境变量（均有默认值，可按需覆盖）：

| 变量 | 默认值 |
|---|---|
| `LLM_API_KEY` | 内置 Key |
| `LLM_BASE_URL` | `https://api.deepseek.com` |
| `LLM_MODEL` | `deepseek-v4-pro` |

### 运行测试

```bash
npm test
```

## 页面入口

| 页面 | 地址 | 功能 |
|---|---|---|
| 用户列表 | `/#/users` | 查看全部用户并按用户 ID 搜索 |
| 用户详情 | `/#/users/{userId}` | 查看健康画像并执行风险预测 |
| 问卷模式 | `/#/questionnaire` | 匿名填写健康信息并生成风险结果 |

前端使用 Hash 路由，页面路径中的 `#` 需要保留。

## API

### 获取用户列表

```http
GET /api/v1/users
GET /api/v1/users?q=US-01
```

### 获取用户详情

```http
GET /api/v1/users/{userId}
```

### 为数据库用户生成预测

```http
POST /api/v1/users/{userId}/prediction
Content-Type: application/json
```

请求体可为空或省略。

### 提交问卷预测

```http
POST /api/v1/predictions
Content-Type: application/json
```

请求示例：

```json
{
  "source": "questionnaire",
  "input": {
    "basicInfo": { "ageYears": 42, "gender": "female", "heightCm": 165, "weightKg": 68, "bmi": 25, "waistCm": 82 },
    "lifestyle": {
      "smokingStatus": "never", "alcoholSummary": null,
      "physicalActivitySummary": "每周步行 3 次",
      "sedentaryMinutesPerDay": 480, "weekdaySleepHours": 6.5,
      "weekendSleepHours": 8, "dietaryRecord": null
    },
    "healthHistory": {
      "knownDiseases": [], "familyHistory": { "diabetes": "mother" },
      "currentSymptoms": [], "generalIndicators": {}
    },
    "featureSchemaVersion": "1.0"
  }
}
```

预测响应示例：

```json
{
  "predictionId": "pred_anon_xxx",
  "userId": null,
  "modelVersion": "regression_v1",
  "featureSchemaVersion": "1.0",
  "diseases": [
    {
      "diseaseId": "diabetes",
      "riskLevel": "medium",
      "screeningPriority": "routine",
      "evidenceLevel": "sufficient",
      "riskFactors": [{ "id": "family_history_diabetes", "label": "家族糖尿病史", "evidence": "..." }],
      "protectiveFactors": []
    },
    {
      "diseaseId": "hypertension",
      "riskLevel": "low",
      "screeningPriority": "monitor",
      "evidenceLevel": "sufficient",
      "riskFactors": [],
      "protectiveFactors": [{ "id": "never_smoked", "label": "未吸烟史", "evidence": "..." }]
    }
  ],
  "boundaryNote": "结果来自演示模型，不是患病概率、未来发病预测或临床诊断。"
}
```

证据有限时每个疾病对象追加 `missingEvidenceFields: string[]`。

## 预测架构

```text
数据库用户 ─┐
            ├─> PredictionInput ─> 输入校验 ─> 模型（regression / llm）─> polisher ─> PredictionResult
问卷输入   ─┘
```

新增模型只需在 `src/prediction/models/` 下创建导出 `predict(input)` 的文件，并在 `index.js` 的 `MODELS` 对象中注册。

## 项目结构

```text
risk_ident_demo_2/
├─ data/
│  ├─ demo/                       # 应用使用的匿名演示数据
│  │  ├─ user_profiles.json
│  │  ├─ risk_results.json        # 保留作测试 fixture
│  │  └─ risk_explanations.json
│  └─ source/                     # 原始数据集，不提交到 Git
├─ src/
│  ├─ server.js
│  ├─ router.js
│  ├─ repository.js
│  ├─ errors.js
│  ├─ users/controller.js
│  ├─ prediction/
│  │  ├─ controller.js
│  │  ├─ mapper.js
│  │  ├─ validator.js
│  │  ├─ service.js
│  │  ├─ engine.js                # 因子提取逻辑，被回归模型复用
│  │  ├─ polisher.js              # RawPrediction → PredictionResult
│  │  └─ models/
│  │     ├─ index.js              # 模型工厂（PREDICTION_MODEL 环境变量）
│  │     ├─ regression.js         # 简单线性打分模型
│  │     └─ llm.js                # DeepSeek LLM 模型
│  ├─ results/adapter.js          # attachExplanation 工具函数
│  └─ static/
└─ test/
```

## 错误响应

```json
{ "error": { "code": "INVALID_INPUT", "message": "...", "details": [{ "field": "basicInfo.ageYears", "reason": "..." }] } }
```

| HTTP | 错误码 | 含义 |
|---|---|---|
| 400 | `INVALID_INPUT` | 输入缺失、类型错误或范围错误 |
| 400 | `SCHEMA_VERSION_UNSUPPORTED` | `featureSchemaVersion` 不是 `1.0` |
| 404 | `USER_NOT_FOUND` | 指定用户不存在 |
| 422 | `TARGET_LEAKAGE` | 输入包含禁止的目标泄漏字段 |
| 500 | `INTERNAL_ERROR` | 未预期的服务端错误 |

## 风险结果边界

当前实现不将以下字段作为预测输入（目标泄漏防护）：

- 糖尿病或高血压诊断
- 收缩压和舒张压
- HbA1c
- 空腹血糖
