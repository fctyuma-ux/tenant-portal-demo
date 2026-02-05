import json

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from common import BASE_HTML, get_db, get_sprint_subtabs, render_template

router = APIRouter()


@router.get("/sprint/{sprint_num}/checklist", response_class=HTMLResponse)
def sprint_checklist_view(sprint_num: int, request: Request = None):
    """Sprint チェックリスト（フィルタ付き）"""
    conn = get_db()
    cursor = conn.cursor()

    # 全データを取得（trainee_item_statusテーブルは使用しない）
    cursor.execute("""
        SELECT
            d.domain_id,
            d.name as domain_name,
            c.category_id,
            c.name as category_name,
            s.subcategory_id,
            s.name as subcategory_name,
            ci.item_id,
            ci.title,
            ci.item_type,
            sr.required_status
        FROM sprint_requirements sr
        JOIN checklist_items ci ON sr.item_id = ci.item_id
        JOIN subcategories s ON ci.subcategory_id = s.subcategory_id
        JOIN categories c ON s.category_id = c.category_id
        JOIN domains d ON c.domain_id = d.domain_id
        WHERE sr.sprint = ?
        ORDER BY d.domain_id, c.category_id, s.subcategory_id, ci.item_id
    """, (sprint_num,))
    all_items = cursor.fetchall()

    conn.close()

    # データを構造化
    data_dict = {}
    for row in all_items:
        domain_id = row["domain_id"]
        domain_name = row["domain_name"]
        category_id = row["category_id"]
        category_name = row["category_name"]
        subcategory_id = row["subcategory_id"]
        subcategory_name = row["subcategory_name"]

        if domain_id not in data_dict:
            data_dict[domain_id] = {
                "name": domain_name,
                "categories": {}
            }

        if category_id not in data_dict[domain_id]["categories"]:
            data_dict[domain_id]["categories"][category_id] = {
                "name": category_name,
                "subcategories": {}
            }

        if subcategory_id not in data_dict[domain_id]["categories"][category_id]["subcategories"]:
            data_dict[domain_id]["categories"][category_id]["subcategories"][subcategory_id] = {
                "name": subcategory_name,
                "items": []
            }

        data_dict[domain_id]["categories"][category_id]["subcategories"][subcategory_id]["items"].append({
            "item_id": row["item_id"],
            "title": row["title"],
            "item_type": row["item_type"]
        })

    # JSON データを埋め込み
    data_json = json.dumps(data_dict)

    subtabs = get_sprint_subtabs(sprint_num, request.url.path if request else f"/sprint/{sprint_num}/checklist")

    content_template = """
    <h1>Sprint @SPRINT_NUM チェックリスト</h1>
    <div class="subtabs">
        @SUBTABS
    </div>

    <div class="filter-section" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 15px; align-items: end;">
        <div>
            <label for="domain-filter" style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px;">Domain</label>
            <select id="domain-filter" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </select>
        </div>

        <div>
            <label for="category-filter" style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px;">カテゴリ</label>
            <select id="category-filter" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" disabled>
            </select>
        </div>

        <div>
            <label for="subcategory-filter" style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px;">サブカテゴリ</label>
            <select id="subcategory-filter" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" disabled>
                <option value="">すべて</option>
            </select>
        </div>

    </div>

    <div id="checklist-result"></div>

    <script>
        const checklistData = @DATA_JSON;

        function populateDomains() {
            const select = document.getElementById('domain-filter');
            const domains = Object.keys(checklistData).map(k => ({
                id: k,
                name: checklistData[k].name
            }));

            if (domains.length > 0) {
                const firstDomain = domains[0];
                const option = document.createElement('option');
                option.value = firstDomain.id;
                option.textContent = firstDomain.name;
                select.appendChild(option);

                // If there are more domains, add the rest
                for (let i = 1; i < domains.length; i++) {
                    const opt = document.createElement('option');
                    opt.value = domains[i].id;
                    opt.textContent = domains[i].name;
                    select.appendChild(opt);
                }

                // Trigger update for first domain
                updateCategories();
            }
        }

        function updateCategories() {
            const domainId = document.getElementById('domain-filter').value;
            const categorySelect = document.getElementById('category-filter');
            const subcategorySelect = document.getElementById('subcategory-filter');

            // Clear existing options
            categorySelect.innerHTML = '';
            subcategorySelect.innerHTML = '<option value="">すべて</option>';
            subcategorySelect.disabled = true;

            if (!domainId) {
                categorySelect.disabled = true;
                return;
            }

            categorySelect.disabled = false;

            const categories = Object.keys(checklistData[domainId].categories).map(k => ({
                id: k,
                name: checklistData[domainId].categories[k].name
            }));

            if (categories.length > 0) {
                const firstCat = categories[0];
                const option = document.createElement('option');
                option.value = firstCat.id;
                option.textContent = firstCat.name;
                categorySelect.appendChild(option);

                for (let i = 1; i < categories.length; i++) {
                    const opt = document.createElement('option');
                    opt.value = categories[i].id;
                    opt.textContent = categories[i].name;
                    categorySelect.appendChild(opt);
                }

                // Trigger update for first category
                updateSubcategories();
            }
            applyFilter();
        }

        function updateSubcategories() {
            const domainId = document.getElementById('domain-filter').value;
            const categoryId = document.getElementById('category-filter').value;
            const subcategorySelect = document.getElementById('subcategory-filter');

            // Clear existing options
            subcategorySelect.innerHTML = '<option value="">すべて</option>';
            subcategorySelect.disabled = true;

            if (!domainId || !categoryId) {
                return;
            }

            subcategorySelect.disabled = false;

            const subcategories = Object.keys(checklistData[domainId].categories[categoryId].subcategories).map(k => ({
                id: k,
                name: checklistData[domainId].categories[categoryId].subcategories[k].name
            }));

            subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.id;
                option.textContent = subcategory.name;
                subcategorySelect.appendChild(option);
            });
            applyFilter();
        }

        function applyFilter() {
            const domainId = document.getElementById('domain-filter').value;
            const categoryId = document.getElementById('category-filter').value;
            const subcategoryId = document.getElementById('subcategory-filter').value;

            const result = document.getElementById('checklist-result');
            result.innerHTML = '';

            // Generate table
            let html = '<table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; font-size: 13px;">';
            html += '<thead><tr style="background: #f8f9fa; border-bottom: 2px solid #007bff;"><th style="padding: 8px; text-align: left; font-weight: 600; width: 12%;">サブカテゴリ</th><th style="padding: 8px; text-align: left; font-weight: 600;">項目</th><th style="padding: 8px; text-align: left; font-weight: 600; width: 12%;">タイプ</th></tr></thead>';
            html += '<tbody>';

            const typeMap = {
                "check_only": "確認のみ",
                "judgment_focused": "判断重視",
                "implementation_optional": "実装選択",
                "implementation_required": "実装必須"
            };

            const typeColorMap = {
                "check_only": "#e3f2fd",
                "judgment_focused": "#f3e5f5",
                "implementation_optional": "#fff3e0",
                "implementation_required": "#e8f5e9"
            };

            const typeTextColorMap = {
                "check_only": "#1565c0",
                "judgment_focused": "#6a1b9a",
                "implementation_optional": "#e65100",
                "implementation_required": "#2e7d32"
            };

            let categoryGroups = {};

            if (subcategoryId) {
                const subcats = checklistData[domainId].categories[categoryId].subcategories;
                if (subcats[subcategoryId]) {
                    categoryGroups[subcategoryId] = subcats[subcategoryId];
                }
            } else {
                categoryGroups = checklistData[domainId].categories[categoryId].subcategories;
            }

            Object.keys(categoryGroups).forEach(subId => {
                const subcat = categoryGroups[subId];
                let firstRow = true;

                subcat.items.forEach(item => {
                    const typeDisplay = typeMap[item.item_type] || item.item_type;
                    const typeBgColor = typeColorMap[item.item_type] || '#f0f0f0';
                    const typeTextColor = typeTextColorMap[item.item_type] || '#666';

                    if (firstRow) {
                        html += '<tr style="border-bottom: 1px solid #eee;">';
                        html += '<td style="padding: 8px; background: #f9f9f9; font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>' + subcat.name + '</strong></td>';
                        firstRow = false;
                    } else {
                        html += '<tr style="border-bottom: 1px solid #eee;">';
                        html += '<td style="padding: 8px;"></td>';
                    }

                    html += '<td style="padding: 8px;">' + item.title + '</td>';
                    html += '<td style="padding: 8px; font-size: 11px;"><span style="background: ' + typeBgColor + '; color: ' + typeTextColor + '; padding: 4px 6px; border-radius: 3px; font-weight: 600;">' + typeDisplay + '</span></td>';
                    html += '</tr>';
                });
            });

            html += '</tbody></table>';
            result.innerHTML = html;
        }

        // Initialize
        document.getElementById('domain-filter').addEventListener('change', () => {
            updateCategories();
        });
        document.getElementById('category-filter').addEventListener('change', updateSubcategories);
        document.getElementById('subcategory-filter').addEventListener('change', applyFilter);

        populateDomains();
        applyFilter();
    </script>
    """

    content = render_template(
        content_template,
        SPRINT_NUM=sprint_num,
        SUBTABS=subtabs,
        DATA_JSON=data_json,
    )

    return BASE_HTML.format(title=f"Sprint {sprint_num} - チェックリスト", content=content)
