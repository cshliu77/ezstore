請使用Git，開一個分支叫做feature/ezstore-agent-develop進行下列功能開發報價單管理的Agent功能與MCP Server的開發：
1.Agent功能與情境需求，使用者可以透過自然語言指令來完成以下操作：
1.1.查詢報價單：使用者可以說「我要查詢報價單，報價單編號：QT-20260330-001」，Agent會根據使用者提供的報價單編號，查詢並回應該報價單的詳細資訊，包含報價品項的清單。
1.2.查詢客戶的報價單清單：使用者可以說「我要查詢客戶的報價單清單，客戶名稱：ABC公司」，Agent會根據使用者提供的客戶名稱，查詢並回應該客戶的所有報價單清單。
1.3.修改報價單報價因子：使用者可以說「我要修改報價單報價因子，報價單編號：QT-20260330-001，報價因子改為1.5」，Agent會根據使用者提供的報價單編號和新的報價因子，更新該報價單的報價因子設定。
1.4.修改報價單總價：使用者可以說「我要修改報價單總價，報價單編號：QT-20260330-001，總價改為100000」，Agent會根據使用者提供的報價單編號和新的總價，透過二分法搜尋更新該報價單的報價因子來滿足使用者提出的總價數值，二分法調整最多迭代20次。  
1.5.報價單轉訂單：使用者可以說「我要將報價單轉訂單，報價單編號：QT-20260330-001」，Agent會根據使用者提供的報價單編號，將該報價單的資訊轉換成訂單資訊，並且建立一筆新的訂單資料。
1.6.複製報價單：使用者可以說「我要複製報價單，報價單編號：QT-20260330-001」，Agent會根據使用者提供的報價單編號，複製該報價單的資訊，並且透過MCP Server提供的報價單複製功能，建立一筆新的報價單資料，新的報價單編號會自動生成並回應給使用者。
1.7.所有修改行為，都要先複製報價單，然後在複製的報價單上進行修改，確保原始報價單的資料不會被直接修改。
1.8.所有的回答，都要給使用者報價單或訂單的系統連結(不要使用 Markdown 格式，直接給純文字連結)，讓使用者可以直接點擊連結進入系統查看報價單或訂單的詳細資訊。
1.9.禁止Agent回應非報價單管理相關的功能需求，確保Agent專注在報價單管理的功能上。

2.技術需求：
2.1.使用Python 3.11與Google Agent Development Kit (ADK)1.22.1以上開發。
2.2.使用uv venv建立虛擬環境，並安裝Google Agent Development Kit來做本機開發測試。
2.3.Google Agent Development Kit (ADK)以Container方式部署到本機端的Docker環境，並更新既有的docker-compose.yml文件。
2.4.使用Python開發MCP Server工具，並且將工具註冊到MCP Server中，讓Agent可以呼叫這些工具來完成報價單管理的功能。
2.5.在前端專案，繼續使用ReactJS開發一個與Agent互動的UI元件，讓使用者可以透過這個元件與Agent進行對話，並且在對話中使用自然語言指令來操作報價單管理的功能。
2.6.使用Playwright搭配Playwright-MCP進行前端的E2E測試與測試腳本開發，確保使用者流程的正確性。
2.7.本次需求會在本專案資料夾下建立下列子資料夾：
2.7.1.agent：放置Agent相關的程式碼與設定檔。
2.7.2.mcp_server：放置MCP Server相關的程式碼與設定檔。
2.8.Agent服務與MCP Server服務各自使用一個Container部署。
2.9.Google Agent Development Kit (ADK)的LLM選擇使用Gemini 2.5 flash(免費)，透過AI Studio 提供的API key整合到Agent的設定中。
2.9.1.API Key透過使用者設定在.env檔案中，並且在Docker Compose中設定環境變數，讓Agent Container可以讀取到API Key的值。你要生成.env的範例檔案，引導使用者填入API Key的值。
2.9.2.確保API Key的安全性，不要將API Key直接寫在程式碼中，必須要透過環境變數的方式來使用API Key。
2.10.MCP Server提供Streamable HTTP的API，讓Agent可以透過HTTP請求來呼叫MCP Server提供的工具功能。切記不要使用SSE（Server-Sent Events)的方式來實作MCP Server的API，因為SSE已經被MCP標記為deprecated了。
3.文件需求：
3.1.更新Readme.md文件，增加Agent與MCP Server相關的說明，包含功能、架構、技術選型、部署方式、測試方式等
4.實作順序，依照下列順序實作，分階段讓我驗證階段成果：
4.1.MCP Server — 先完成，可獨立用 curl 測試
4.2.Agent — 連接 MCP Server，用 adk web 本機測試
4.3.Chat UI — React 頁面 + nginx proxy
4.4.Docker — 更新 compose 檔案
4.5.E2E 測試 — 端對端驗證
4.6.CI + README — 最後更新

優先透過Context7 MCP來確認各種元件的功能與使用方式，確保在開發過程中能夠順利整合Agent與MCP Server的功能。
請你務必確認skills與MCP tools是否有適合的tool可以協助開發這個專案，並且使用這些skills與MCP tools。
