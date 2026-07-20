# 慢性病风险识别 Demo

一个使用原生 Node.js 构建的慢性病风险筛查演示系统。系统基于同一份用户健康信息，同时生成糖尿病和高血压风险结果，并展示筛查优先级、证据状态、主要风险因素和保护因素。

> 本项目仅用于产品和技术演示。输出结果不代表患病概率、未来发病预测或临床诊断，不能替代专业医疗意见。

## 主要功能

- 展示 24 名匿名用户的健康画像；
- 支持按用户 ID 搜索；
- 查看基本信息、生活方式和健康史；
- 同时生成糖尿病与高血压风险结果；
- 展示低、中、高风险等级及筛查优先级；
- 支持「生活方式筛查」和「综合健康画像」两种评估模式切换；
- 展示预生成的整体总结与风险因素解释文本（模式感知）；
- 数据不足时明确标记「证据有限」，并列出缺失字段清单；
- 支持数据库用户和问卷两种预测入口，问卷页面已上线；
- 对外响应隐藏内部评分和模型权重；
- 阻止血压、HbA1c、空腹血糖等目标泄漏字段进入预测。

## 技术特点

- Node.js 20+
- ES Modules
- 原生 `node:http` HTTP 服务
- 原生 HTML、CSS 和 JavaScript
- 原生 `node:test` 自动化测试
- 无第三方运行时依赖

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm

### 启动项目

```bash
npm start
```

默认访问地址：

```text
http://localhost:3000
```

可以使用 `PORT` 环境变量修改监听端口。

PowerShell 示例：

```powershell
$env:PORT = 8080
npm start
```

### 运行测试

```bash
npm test
```

## 页面入口

| 页面 | 地址 | 功能 |
|---|---|---|
| 用户列表 | `/#/users` | 查看全部用户并按用户 ID 搜索。 |
| 用户详情 | `/#/users/{userId}` | 查看健康画像、切换评估模式并执行风险预测。 |
| 问卷模式 | `/#/questionnaire` | 匿名填写健康信息并生成同款风险结果。 |

前端使用 Hash 路由，因此页面路径中的 `#` 需要保留。

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

请求体可选：

```json
{ "mode": "lifestyle_screening" }
```

`mode` 支持 `lifestyle_screening`（默认）与 `comprehensive_profile`。请求体缺省或省略时按默认值处理。

### 提交问卷预测

```http
POST /api/v1/predictions
Content-Type: application/json
```

请求示例：

```json
{
  "source": "questionnaire",
  "mode": "lifestyle_screening",
  "input": {
    "basicInfo": {
      "ageYears": 42,
      "gender": "female",
      "heightCm": 165,
      "weightKg": 68,
      "bmi": 25,
      "waistCm": 82
    },
    "lifestyle": {
      "smokingStatus": "never",
      "alcoholSummary": null,
      "physicalActivitySummary": "每周步行 3 次",
      "sedentaryMinutesPerDay": 480,
      "weekdaySleepHours": 6.5,
      "weekendSleepHours": 8,
      "dietaryRecord": null
    },
    "healthHistory": {
      "knownDiseases": [],
      "familyHistory": {
        "diabetes": "mother"
      },
      "currentSymptoms": [],
      "generalIndicators": {}
    },
    "featureSchemaVersion": "1.0"
  }
}
```

预测响应包含两种疾病、当前模式与可选解释：

```json
{
  "predictionId": "pred_anon_xxx",
  "userId": null,
  "modelVersion": "demo_fallback_rule_v1",
  "featureSchemaVersion": "1.0",
  "mode": "lifestyle_screening",
  "overallSummary": "……（预生成整体总结，仅数据库路径命中解释卡时出现）",
  "diseases": [
    {
      "diseaseId": "diabetes",
      "riskLevel": "medium",
      "screeningPriority": "routine",
      "evidenceLevel": "sufficient",
      "riskFactors": [],
      "protectiveFactors": [],
      "explanation": {
        "riskConclusion": "……",
        "mainFactorExplanations": [{ "factorId": "...", "explanation": "..." }],
        "protectiveFactorExplanations": []
      }
    },
    {
      "diseaseId": "hypertension",
      "riskLevel": "medium",
      "screeningPriority": "routine",
      "evidenceLevel": "sufficient",
      "riskFactors": [],
      "protectiveFactors": []
    }
  ],
  "boundaryNote": "结果来自演示占位规则，不是患病概率、未来发病预测或临床诊断。"
}
```

- 兜底路径（匿名问卷或缺卡用户）不返回 `overallSummary` 与 `explanation`；证据有限时每个疾病对象追加 `missingEvidenceFields: string[]`。
- 数据库路径读取用户预生成风险卡；当请求 `comprehensive_profile` 但该模式无预生成节点时，会显式回退到 `lifestyle_screening` 并返回 `modeFallback: true`。

## 项目结构

```text
risk_ident_demo/
├─ README.md
├─ PROJECT.md
├─ package.json
├─ data/
│  ├─ demo/                       # 应用使用的匿名演示数据
│  │  ├─ user_profiles.json
│  │  ├─ risk_results.json
│  │  └─ risk_explanations.json
│  └─ source/                     # 原始及建模准备数据，不提交到 Git
├─ src/
│  ├─ server.js                   # HTTP 服务与 API 注册
│  ├─ router.js                   # 轻量路由器
│  ├─ repository.js               # Demo JSON 数据仓库
│  ├─ errors.js                   # 统一错误结构
│  ├─ users/
│  │  └─ controller.js            # 用户列表与详情
│  ├─ prediction/
│  │  ├─ controller.js            # 数据库及问卷预测入口
│  │  ├─ mapper.js                # 原始画像到统一输入的映射
│  │  ├─ validator.js             # 输入和目标泄漏校验
│  │  ├─ service.js               # 唯一预测服务入口
│  │  └─ engine.js                # 无预生成结果时的兜底规则
│  ├─ results/
│  │  └─ adapter.js               # Demo 风险卡响应适配器
│  └─ static/
│     ├─ index.html
│     ├─ app.js
│     └─ styles.css
└─ test/                           # API、契约和业务规则测试
```

更完整的业务定义、输入字段范围和错误码说明见 [`PROJECT.md`](./PROJECT.md)。

## 预测流程

```text
数据库用户 ─┐
            ├─> PredictionInput ─> 输入校验 ─> 统一预测服务 ─> 风险结果（含 mode 字段）
问卷输入   ─┘
```

对于 Demo 数据库中已有风险卡的用户，预测服务按请求的 `mode` 读取预生成的 `lifestyle_screening` 或 `comprehensive_profile` 结果，并挂载对应的解释文本；缺失模式节点时显式回退到 `lifestyle_screening` 并返回 `modeFallback: true`。匿名问卷或没有预生成结果的用户走确定性兜底规则引擎，兜底引擎对糖尿病与高血压独立评分，`mode` 仅在响应中回显不影响评分。

## 数据说明

`data/demo/` 包含前端演示所需的匿名数据：

- `user_profiles.json`：24 名用户的健康画像；
- `risk_results.json`：糖尿病和高血压预生成风险结果，覆盖 `lifestyle_screening` 与 `comprehensive_profile` 两种模式；
- `risk_explanations.json`：预生成解释文本（整体总结 + 分疾病风险因素解释），仅命中风险卡的用户在响应中返回。

`data/source/` 保存体积较大的原始及模型准备数据，仅用于离线分析和后续建模，Web 应用不会读取，并已通过 `.gitignore` 排除。

## 风险结果边界

当前实现是确定性的 Demo 规则和预生成数据适配层，不是经过训练、验证或校准的临床预测模型。项目有意不把以下目标相关信息作为预测输入：

- 糖尿病或高血压诊断；
- 收缩压和舒张压；
- HbA1c；
- 空腹血糖。

这样可以避免将目标疾病的直接证据错误地作为风险特征，同时也意味着当前结果只能用于演示筛查流程。

## 错误响应

API 使用统一错误结构：

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input",
    "details": [
      {
        "field": "basicInfo.ageYears",
        "reason": "must be within [18, 120]"
      }
    ]
  }
}
```

主要错误码包括：

| HTTP 状态 | 错误码 | 含义 |
|---|---|---|
| `400` | `INVALID_INPUT` | 输入缺失、类型错误、范围错误或 JSON 无效。 |
| `400` | `SCHEMA_VERSION_UNSUPPORTED` | 特征结构版本不是 `1.0`。 |
| `404` | `USER_NOT_FOUND` | 指定用户不存在。 |
| `422` | `TARGET_LEAKAGE` | 输入包含禁止的目标泄漏字段。 |
| `500` | `INTERNAL_ERROR` | 未预期的服务端错误。 |

## 当前范围

项目暂不包括：

- 真实模型训练和概率校准；
- 临床诊断功能；
- EHR 接入；
- 在线大模型解释（仅使用预生成文本）。

