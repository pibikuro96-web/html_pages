document.addEventListener("DOMContentLoaded", function () {
    fetch("player_data.json")
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector("#playerTable tbody");

            data.forEach(player => {
                let tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${player.rank}</td>
                    <td><a href="${player.name}.html">${player.name}</a></td>
                    <td>${player.team}</td>
                `;

                // 「所属」のセルだけ色を付ける
                let teamClass = getTeamClass(player.team);
                tr.children[2].classList.add(teamClass);

                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error("データの読み込みに失敗しました", error));
});

// 球団名を対応するクラスに変換する関数（変更なし）
function getTeamClass(teamName) {
    const teamMapping = {
        "読売ジャイアンツ": "team-giants",
        "東京ヤクルトスワローズ": "team-swallows",
        "横浜DeNAベイスターズ": "team-baystars",
        "中日ドラゴンズ": "team-dragons",
        "阪神タイガース": "team-tigers",
        "広島東洋カープ": "team-carp",
        "北海道日本ハムファイターズ": "team-fighters",
        "東北楽天ゴールデンイーグルス": "team-eagles",
        "千葉ロッテマリーンズ": "team-marines",
        "埼玉西武ライオンズ": "team-lions",
        "オリックス・バファローズ": "team-buffaloes",
        "福岡ソフトバンクホークス": "team-hawks",
        "オイシックス新潟アルビレックスBC": "team-niigata",
        "くふうハヤテベンチャーズ静岡": "team-shizuoka"
    };

    if (teamName.includes("元")) {
        return "former-team"; // 退団選手はグレー表示
    }

    return teamMapping[teamName] || ""; // 該当チームがなければ空
}

// テーブルのソート機能
function sortTable(columnIndex) {
    let table = document.getElementById("playerTable");
    let rows = Array.from(table.rows).slice(1); // ヘッダー以降の行を取得
    let isAscending = table.dataset.order !== "asc"; // 昇順・降順を切り替え

    rows.sort((rowA, rowB) => {
        let cellA = rowA.cells[columnIndex].textContent.trim();
        let cellB = rowB.cells[columnIndex].textContent.trim();

        // 順序列（数値）は数値として比較
        if (columnIndex === 0) {
            return isAscending ? cellA - cellB : cellB - cellA;
        }

        // 他の列（名前・所属）は文字列として比較
        return isAscending ? cellA.localeCompare(cellB, "ja") : cellB.localeCompare(cellA, "ja");
    });

    // ソートした行を再配置
    rows.forEach(row => table.appendChild(row));

    // ソート順を記憶
    table.dataset.order = isAscending ? "asc" : "desc";
}
