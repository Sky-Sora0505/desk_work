# AWS IAM ポリシーの書き方

CLF-C02 の学習で質問した内容です。

## 19-1. AWS IAM ポリシーの書き方

IAM で権限を決める「コード」は、プログラミング言語ではなく JSON 形式の設定です。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"],
      "Condition": {
        "IpAddress": { "aws:SourceIp": "203.0.113.0/24" }
      }
    }
  ]
}
```

| 要素 | 意味 | 必須か |
| --- | --- | --- |
| `Version` | ポリシー言語の版。必ず `2012-10-17`（今日の日付ではなく固定値） | 実質必須 |
| `Sid` | ステートメントのラベル | 任意 |
| `Effect` | `Allow` か `Deny` | 必須 |
| `Principal` | 誰が（信頼ポリシーと、S3 バケットポリシーなどのリソースベースポリシーだけ） | 条件付き |
| `Action` | 何を（`サービス名:API名`） | 必須 |
| `Resource` | どれに（ARN） | アイデンティティベースポリシーでは必須 |
| `Condition` | どんなときに（IP 制限、MFA 必須など） | 任意 |

並び順は JSON なので自由ですが、慣例は「誰が・何を・どれに・どんな条件で」の順です。

**`Condition` は3階層の固定順**です。`"IpAddress": { "aws:SourceIp": "203.0.113.0/24" }` は「`aws:SourceIp` を、IP アドレスとして、`203.0.113.0/24` と比べる」と読みます。

| 階層 | 名前 | 例 | 決めること |
| --- | --- | --- | --- |
| 1 | 条件演算子 | `IpAddress`、`StringEquals`、`Bool`、`DateGreaterThan`、`ArnLike` | 比べ方 |
| 2 | 条件キー | `aws:SourceIp`、`aws:MultiFactorAuthPresent` | 何を比べるか |
| 3 | 値 | `"203.0.113.0/24"` | 何と比べるか |

条件キーの `:` は「名前空間:キー名」です。`aws:` は全サービス共通、`s3:` や `ec2:` はそのサービス専用です。MFA 必須なら `"Bool": { "aws:MultiFactorAuthPresent": "true" }` と書きます。

**ARN は6つの欄をコロンで区切った固定順**です。

| 順 | 欄 | 例 |
| --- | --- | --- |
| 1 | `arn` | 固定の文字 |
| 2 | パーティション | ふつう `aws` |
| 3 | サービス | `s3`、`ec2`、`iam`、`lambda` |
| 4 | リージョン | `ap-northeast-1` |
| 5 | アカウント ID | 12桁の数字 |
| 6 | リソース | サービスごとに書き方が違う |

| 例 | 空になっている欄と理由 |
| --- | --- |
| `arn:aws:s3:::my-bucket` | リージョンとアカウント ID が空。バケット名は全世界で1つしかないので、要らない。区切りだけ残るので `:::` になる |
| `arn:aws:iam::123456789012:user/sky05` | リージョンだけ空。IAM はグローバルサービス |
| `arn:aws:ec2:ap-northeast-1:123456789012:instance/i-0abc123` | 全部埋まる |

| ARN | 指すもの | 対応する Action |
| --- | --- | --- |
| `arn:aws:s3:::my-bucket` | バケットそのもの | `s3:ListBucket` など |
| `arn:aws:s3:::my-bucket/*` | 中のオブジェクト全部 | `s3:GetObject`、`s3:PutObject` など |

一覧の取得はバケットへの操作、ファイルの取得はオブジェクトへの操作なので、**両方書かないと動きません**。`.` が出てくるのは ARN ではなく、`ec2.amazonaws.com` のようなサービスの名前（DNS 名の形）と IP アドレスだけです。つまり「`:` は AWS の識別子の区切り、`.` は DNS 名か IP アドレス」です。`203.0.113.0/24` は説明用に予約された住所なので、実際に書くときは自分の IP に置き換えます。

| 試験で問われる点 | 内容 |
| --- | --- |
| 評価の優先順位 | 明示的な Deny ＞ 明示的な Allow ＞ 何も書いていない（暗黙の Deny） |
| `Condition` の用途 | IP 制限、MFA 必須 |
| ワイルドカード | `"Action": "*"` や `"Resource": "*"` は最小権限の原則に反する |
| 信頼ポリシー | ロールを「誰が引き受けられるか」を決める。`Principal` と `sts:AssumeRole` が出てくる |

この倉庫の Tailscale ACL も同じ考え方です。「誰が（src）・どれに（dst）・何を（ip）」を書き、書いていないものは拒否されます。
