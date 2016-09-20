# 在自动化服务里以 API 的方式读取 Google Analytics 的数据

对于一个关注 [Growth Hacking](https://zh.wikipedia.org/wiki/%E6%88%90%E9%95%B7%E9%A7%AD%E5%AE%A2) 的创业团队来说， Google Analytics (GA) 真是超级好用。

不过有些特殊场景需要把 GA 里的数据导出，做进一步的分析。

我最经就碰到这样的场景，需要把 GA 上的 Session, User 数据定期导入到 MongoDB 里，然后用 Metabase 做分析。

要导出 GA 的数据最简单的方法当然是直接在网页上操作，导出成各种 CSV, PDF 等格式的自定义报告，不过通过后台 API 的方式怎么操作呢？

## 先解决 Authentication 的问题

GA 是 Google 众多优秀服务中的一个，并且 Google 服务一贯都提供良好的 SDK 给开发人员使用。

无论是什么服务，要通过 `SDK` 取得存储在 Google 上的数据，最重要的就是解决 `Authentication` 的问题。
 
Google 大部分语言的 `SDK` 都提供了这三种 `Authentication` 的方式：
 
1\. `API Key`

`API Key` 的方式比较适合于直接在网页里集成的服务，它的特点是访问量很大。

比如网页里用到 Google Maps ，需要把 `API Key` 作为参数明文地传到 Google，相当于公开了 `API Key`，但是这样便于 Google 统计 `API Key` 的使用量。

因此 `API Key` 一定要加上[密钥限制](https://support.google.com/googleapi/answer/6310037)，这样即使 `API Key` 泄露了也没关系，因为 Google 会检查是不是来自指定网站的流量。

经过我的实验，`Key` 这种方式并不能用来获取 GA 的数据，会报一个 `Login Required` 的 401 错误，我猜正是因为这种认证方式的安全性太差了。

2\. `Oauth2`

`OAuth2` 这种方式现在非常流行，例如使用 Weibo 登录，使用 Github 登录等等，特别是面向程序员的网站，
如果不支持 Github 登录，我看都不好意思和人打招呼。

为了能在没有浏览器环境的服务器上跑自动化服务的脚本，可以用 `OAuth2` 的 `Offline` 模式，流程是：

服务器端的脚本利用 `ClientID` 和 `SecretID` 生成一个登录链接，然后在另一台机器上的浏览器打开这个链接，正常登录并获得一个 Code。
然后服务器端就可以用这个 Code 来获取用户的数据了。

`OAuth2` 这种方式最大的一个特点是需要打开一个登录授权的页面，也就是需要人工干预，并不能够完全自动化。

3\. `JWT`

`API Key` 和 `OAuth` 都不适合做一个自动化的服务，因为它们都是开放的，面向的是一组群体。而开发一个自动化服务，
往往只面向一个唯一的拥有访问权限的帐号。有一个最原始的方式是把用户名和密码保存到本地。

那么怎么才能安全的在本地存储 Google ID 的用户名和密码呢？

首先一个问题是，保存谁的用户名和密码。

一个热爱尝试的开发者的 Google ID 肯定启用了各种 Google 的服务，比如 Gmail，Plus，Driver 等等。
因此肯定不能保存开发者自己的用户名和密码，而是另外一个专用的账户。这个帐号并不用手动去注册，而是由 Google 来生成，叫做 Service Account。

**什么是 Service Account** 

官方的解释 [Service Account](https://support.google.com/cloud/answer/6158849#serviceaccounts)
    
*Service Account 是为了某个服务而生成的一个 Google ID，它会有一个很长的邮箱地址，并且无法直接登录 Google 的各项服务。
要让 Service Account 获得访问 GA 的权限，其实就是把 GA 数据共享给这个用户就可以了，和在 GA 上通过邮箱邀请一个团队成员没有大的差别。*

Service Account 的密码可以通过 `JWT` 的方式加密，并允许开发者下载到本地。

**什么是 JWT**

*`JWT` 是 `JSON Web Tokens` 的缩写，它是一种工业级的用于传输认证信息的通信方式，已经被很多公司所采纳。*

#### 小节

要在自动化服务里访问存储在 Google 的数据，推荐做法是：新建一个 Service Account，然后把 `JWT` 格式的密钥下载到本地
，在 `SDK` 里通过 `JWT` 的方式解决 Authentication 的问题。

## 怎么导出 GA 的数据

其实解决了 Authentication 的问题，再解决导出的问题就很简单了。

可以先在 `Google API Explorer` 网站上点一点熟悉一下 GA 有哪些 API，然后进一步看看各个参数的作用和格式，
`Google API Explorer` 允许你直接在网页上调试各种参数和查看出错信息。

我们正在用的脚本放在了 Github 上，用的是 Google Node.js 版本的 SDK。文档使用 `docco` 生成的，代码和注释左右对照，
只要有一定编程经验就能看懂。

[代码和注释](https://wyvernnot.github.io/ga-scripts/import.html)

