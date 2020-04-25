/* 0.1.1d �������������� � redmine �� ��������� api

cscript redmine.min.js <url> <key> <method> [... <param>]
cscript redmine.min.js <url> <key> users.sync <fields> [<container>] [<auth>]
cscript redmine.min.js <url> <key> issues.change [<query>] <fields> [<filters>]

<url>               - ������� url ����� ��� �������� � api
<key>               - ���� ������� � api ��� ��������������
<method>            - ����������� ����� ������� ����� ���������
    users.sync      - ������������� ������������� �� ldap
        <fields>    - id ���� � ����� ��������� LDAP � ������� id:name#format;id:name
        <container> - ��������� ������������� � LDAP
        <auth>      - id ������ �������������� � ����������
    issues.change   - ��������� ����� � ���������� �������
        <query>     - id ����������� ������� ��� ���� ��������
        <fields>    - ���� � �� �������� � ������� id:value;id:value � �������������
        <filters>   - ������ � ������� id:value;id:value � �������������

*/

var readmine = new App({
    apiKey: null,       // ���� ������� � api ����������
    apiUrl: null,       // ������� url ����� ��� �������� � api
    delimVal: ":",      // ����������� �������� �� �����
    delimKey: ";",      // ����������� ������ ����� �����
    delimId: ".",       // ����������� ��������������� � �����
    delimFormat: "#",   // ����������� ������� � ��������
    stActive: 1,        // ������ ��������� ������������
    stRegistered: 2,    // ������ ������������������� ������������
    stLocked: 3         // ������ ���������������� ������������
});

// ���������� ��������� �������� ����������
(function (app, wsh, undefined) {// �������� ����� �� �������� ���������� �������
    app.lib.extend(app, {// ��������� ������� ���������� ����������
        cache: {// ���������� ������
            "user": {} // ���������� � �������������
        },
        fun: {// ��������� ������� �������� ����������

            /**
             * ��������������� ������ � �������� �������� ���.
             * @param {string} input - ������ � �������.
             * @returns {string|boolean|number|date} �������� ������.
             */

            str2val: function (input) {
                var value;

                switch (true) {// �������������� ��������������
                    case "true" == input: value = true; break;
                    case "false" == input: value = false; break;
                    case !isNaN(input): value = Number(input); break;
                    case "--" == input.charAt(4) + input.charAt(7) &&
                        "::" == input.charAt(13) + input.charAt(16) &&
                        "TZ" == input.charAt(10) + input.charAt(19):
                        value = Date.UTC(// ���� � ������ ������� �����
                            Number(input.substr(0, 4)),
                            Number(input.substr(5, 2)),
                            Number(input.substr(8, 2)),
                            Number(input.substr(11, 2)),
                            Number(input.substr(14, 2)),
                            Number(input.substr(17, 2))
                        );
                        value = new Date(value);
                        break;
                    default: value = input;
                };
                // ���������� ���������
                return value;
            },

            /**
             * ��������������� �������� � ������.
             * @param {string|boolean|number|date} input - �������� ������.
             * @returns {string|null} ������ � ������� ��� null.
             */

            val2str: function (input) {
                var value;

                switch (true) {// �������������� ��������������
                    case app.lib.validate(input, "string"):
                    case app.lib.validate(input, "number"):
                        value = "" + input;
                        break;
                    case app.lib.validate(input, "boolean"):
                        value = input ? "true" : "false";
                        break;
                    case app.lib.validate(input, "date"):
                        value = input.getUTCFullYear()
                            + "-" + app.lib.strPad(input.getUTCMonth(), 2, "0", "left")
                            + "-" + app.lib.strPad(input.getUTCDate(), 2, "0", "left")
                            + "T" + app.lib.strPad(input.getUTCHours(), 2, "0", "left")
                            + ":" + app.lib.strPad(input.getUTCMinutes(), 2, "0", "left")
                            + ":" + app.lib.strPad(input.getUTCSeconds(), 2, "0", "left")
                            + "Z";
                        break;
                    default:
                        value = null;
                };
                // ���������� ���������
                return value;
            },

            /**
             * ���������� ������������ XML � ������ � �������.
             * @param {XMLDocument} [xml] - ������ XML ��� �����������.
             * @returns {object|array|null} ����������������� ������ � �������.
             */

            xml2obj: function (xml) {
                var node, item, value, obj = {}, isArray = null, isNull = true;

                // ������������ xml
                if (xml) {// ���� ������� xml ��� ������
                    // ������������ ��������� � ��������� �� �������� � ������
                    node = xml.documentElement ? xml.documentElement : xml;
                    for (var i = 0, iLen = node.attributes.length; i < iLen; i++) {
                        item = node.attributes[i];// �������� ��������� ��������
                        isNull = false;// �������� ��� ������ �� ������ �������
                        if ("type" != item.name && "array" != item.value) {// ���� �� ������
                            obj[item.name] = app.fun.str2val(item.value);// ��������� ��������
                        } else if (!xml.documentElement) isArray = true;
                    };
                    // ������������ �������� �������� � ��������� �� �������� � ������
                    if (isArray) obj = [];// ������������� � ����� �������
                    for (var i = 0, iLen = xml.childNodes.length; i < iLen; i++) {
                        node = xml.childNodes[i];// �������� ��������� ��������
                        switch (node.nodeType) {// �������������� ���� �����
                            case 1: // ���� ��������
                                isNull = false;// �������� ��� ������ �� ������
                                value = app.fun.xml2obj(node);
                                if (isArray) obj.push(value);
                                else obj[node.nodeName] = value;
                                break;
                            case 3:// ��������� ����
                                isNull = false;// �������� ��� ������ �� ������
                                obj = app.fun.str2val(node.nodeValue);
                                break;
                        };
                    };
                } else isNull = false;
                // ���������� ���������
                return !isNull ? obj : null;
            },

            /**
             * ���������� ������������ ������ � ������� � XML.
             * @param {object|array} [obj] - ������ � ������� ��� �����������.
             * @param {Element} [parent] - ������������ �������.
             * @returns {XMLDocument|DocumentFragment|null} ����������������� ������ � XML.
             */

            obj2xml: function (obj, parent) {
                var value, unit, node, item, items, names, name = "item",
                    xml = null, fragment = null;

                // ������ ����������� �������
                names = {// �������������� ���
                    custom_fields: "custom_field",
                    memberships: "membership",
                    groups: "group",
                    issues: "issue",
                    users: "user",
                    roles: "role"
                };
                // ���������� document ��� xml
                if (!parent) {// ���� �� ������� ��������
                    items = [// ������ ��������������� ��������
                        "MSXML2.DOMDocument.6.0",
                        "MSXML2.DOMDocument.3.0",
                        "MSXML2.DOMDocument"
                    ];
                    for (var i = 0, iLen = items.length; !xml && i < iLen; i++) {
                        item = items[i];// �������� ��������� �������
                        try {// ������� ������������ ������
                            xml = new ActiveXObject(item);
                        } catch (e) { };// ���������� ����������
                    };
                    value = 'version="1.0" encoding="UTF-8"';
                    node = xml.createProcessingInstruction("xml", value);
                    xml.appendChild(node);// ��������� ���������
                } else if (parent.ownerDocument) {// ���� �� document
                    xml = parent.ownerDocument;
                };
                // �������� � ����������� �������
                if (xml) {// ���� ������� ������� xml
                    fragment = xml.createDocumentFragment();
                    // ������������ ������ ���������� � ���� �������
                    if (app.lib.validate(obj, "array")) {// ���� ����� ���������
                        if (parent) {// ���� ����� ��������
                            parent.setAttribute("type", "array");
                            value = parent.nodeName;// �������� ��� ����
                            name = names[value] ? names[value] : name;
                        };
                        // �������� � �������� ���������
                        for (var i = 0, iLen = obj.length; i < iLen; i++) {
                            unit = xml.createElement(name);// ������ ����
                            // �������� � ��������� �������
                            for (var key in obj[i]) {// ����������� �� ������
                                item = obj[i][key];// �������� ��������� �������
                                value = app.fun.val2str(item);// ������������ � ��������
                                switch (true) {// �������� ��������������
                                    case "value" == key && "custom_field" == name:// �������� ����
                                    case "membership" == name:// ��������
                                    case "user" == name:// ��������
                                        node = item;// ��������� �������
                                        item = {};// ���������� ��������
                                        item[key] = node;// ���������
                                    case !value:// � �������� �� ��������
                                        node = app.fun.obj2xml(item, unit);
                                        unit.appendChild(node);
                                        break;
                                    default:// �� ���������
                                        unit.setAttribute(key, value);
                                };
                            };
                            fragment.appendChild(unit);
                        };
                    };
                    // ������������ ������ ���������� � ���� �������
                    if (app.lib.validate(obj, "object")) {// ���� ����� ���������
                        if (parent) name = parent.nodeName;// ��� ��������
                        // �������� � ���������� ��������
                        for (var key in obj) {// ����������� �� ������
                            item = obj[key];// �������� ��������� �������
                            value = app.fun.val2str(item);// ������������ � ��������
                            switch (true) {// �������� ��������������
                                case !!value && "project" == name:// ������
                                case !!value && "tracker" == name:// ������
                                case !!value && "priority" == name:// ���������
                                case !!value && "author" == name:// �����
                                case !!value && "category" == name:// ���������
                                    if (parent) parent.setAttribute(key, value);
                                    break;
                                case !!parent || !unit && !value:// ����� ���������
                                    unit = xml.createElement(key);
                                    if (!value) node = app.fun.obj2xml(item, unit);
                                    else node = xml.createTextNode(value);
                                    unit.appendChild(node);
                                    fragment.appendChild(unit);
                            };

                        };
                        // �������� � ����������� ��������� ��������
                        if (!parent && unit) {// ���� ��� �������� �����
                            for (var key in obj) {// ����������� �� ������
                                item = obj[key];// �������� ��������� �������
                                value = app.fun.val2str(item);// ������������ � ��������
                                if (value) unit.setAttribute(key, value);
                            };
                        };
                    };
                    // ���������� ���������
                    if (!parent) xml.appendChild(fragment);
                };
                return parent ? fragment : xml;
            },

            /**
             * ����������� ������� LDAP � ������ ������������.
             * @param {object} item - ������� � ������� ��� �����������.
             * @param {object} fields - ������ ������������ id ���� � ����� ��������� LDAP.
             * @returns {object} ������ ������������.
             */

            item2user: function (item, fields) {// ������������ ������� � ������������
                var key, value, flag, field, unit, manager, user = {}, error = 0;

                // ��������� ������� �������� � �������
                if (!error) {// ���� ���� ������
                    if (item) {// ���� ������� �������
                    } else error = 1;
                };
                // ��������� ������� ������ ������������
                if (!error) {// ���� ���� ������
                    if (fields) {// ���� ������ �������
                    } else error = 2;
                };
                // ��������� ������ � �������� ������������
                if (!error) {// ���� ���� ������
                    value = item.get("userAccountControl");
                    flag = value & 2;// ������������ ������������
                    user.status = !flag ? app.val.stActive : app.val.stLocked;
                    key = item.get("distinguishedName");
                    app.cache['user'][key] = user;
                };
                // �������� �������� ��� �����
                if (!error) {// ���� ���� ������
                    for (var id in fields) {// ����������� �� ������������
                        // �������� �������� ��� ����
                        field = fields[id];// �������� ����
                        value = "";// ���������� ��������
                        try {// ������� �������� �������� ����
                            value = item.get(field.name);
                        } catch (e) { };// ���������� ����������
                        if (field.format) value = app.fun.format(field.format, value);
                        // ��������������� ������� ��������
                        switch (field.name) {// �������������� ��������������
                            case "manager":// ������������
                                manager = null;// ���������� �������� ���������
                                if (value && value != key) {// ���� ���� ��������
                                    manager = app.cache['user'][value];
                                    if (!manager) {// ���� ��� ����
                                        unit = app.wsh.getLDAP(value)[0];
                                        if (unit) {// ���� ������� �������
                                            manager = app.fun.item2user(unit, fields);
                                            app.cache['user'][value] = manager;
                                        };
                                    };
                                };
                                value = "";// ���������� ��������
                                flag = manager && app.val.stActive == manager.status;
                                if (flag) {// ���� ���� ������������ � �� �� ������������
                                    switch (field.format) {// �������������� �������
                                        case "firstname_lastname":
                                            value = [// ��������� ��������
                                                manager.firstname,
                                                manager.lastname
                                            ].join(" ");
                                            break
                                        case "firstname_lastinitial":
                                            value = [// ��������� ��������
                                                manager.firstname,
                                                manager.lastname.charAt(0) + "."
                                            ].join(" ");
                                            break
                                        case "firstinitial_lastname":
                                            value = [// ��������� ��������
                                                manager.firstname.charAt(0) + ".",
                                                manager.lastname
                                            ].join(" ");
                                            break
                                        case "firstname":
                                            value = manager.firstname;
                                            break
                                        case "lastnamefirstname":
                                            value = [// ��������� ��������
                                                manager.lastname,
                                                manager.firstname
                                            ].join("");
                                            break
                                        case "lastname_comma_firstname":
                                            value = [// ��������� ��������
                                                manager.lastname,
                                                manager.firstname
                                            ].join(", ");
                                            break
                                        case "lastname":
                                            value = manager.lastname;
                                            break
                                        case "username":
                                            value = manager.login;
                                            break
                                        case "lastname_firstname":
                                        default:// ������ ��������
                                            value = [// ��������� ��������
                                                manager.lastname,
                                                manager.firstname
                                            ].join(" ");
                                    };
                                };
                                break;
                        };
                        // ����������� ��������
                        if (!isNaN(id)) {// ���� �������������� ����
                            if (!user.custom_fields) user.custom_fields = [];
                            user.custom_fields.push({ id: id, value: value });
                        } else user[id] = value;
                    };
                };
                // ���������� ���������
                return user;
            },

            /**
             * ����������� ���������� ������.
             * @param {string} name - ��� ������� ��� ��������������.
             * @param {string|number} value - �������� ��� ��������������.
             * @returns {string} ����������������� ��� ������ ��������.
             */

            format: function (name, value) {
                var length, list = [];

                name = name ? ("" + name).toLowerCase() : "";
                switch (name) {// �������������� �������
                    case "phone":// ���������� �����
                        // ������� ��������
                        value = value ? app.lib.trim("" + value) : "";
                        value = value.replace(/\D/g, "");// ��������� ������ �����
                        if (!value.indexOf("8") && value.length > 10) value = "7" + value.substr(1);
                        // ����������� ��������
                        list = [// ������ �������� ��� ��������������
                            { position: 0, length: value.length - 10 },
                            { position: value.length - 10, length: 3 },
                            { position: value.length - 7, length: 3 },
                            { position: value.length - 4, length: 2 },
                            { position: value.length - 2, length: 2 }
                        ];
                        for (var i = 0, iLen = list.length; i < iLen; i++) {
                            length = list[i].length + Math.min(0, list[i].position);
                            list[i] = value.substr(Math.max(0, list[i].position), Math.max(0, length));
                        };
                        if (!list[0] && list[1]) list[0] = 7;
                        value = "";// ������ ��������
                        value += list[0] ? "+" + (list[0]) : "";
                        value += list[1] ? " (" + list[1] + ") " : "";
                        value += list[2] ? list[2] + "-" : "";
                        value += list[3] ? list[3] + (list[2] ? "-" : "") : "";
                        value += list[4] ? list[4] : "";
                        break;
                    default:// �� ��������� ������
                        value = "";
                        break;
                };
                // ���������� ���������
                return value;
            }
        },
        method: {// �������������� ������

            /**
             * �������������� ������������� �� LDAP � ����������.
             * @param {string} fields - ������������ id ���� � ����� ��������� LDAP � ������� id:name#format;id:name.
             * @param {string} [container] - ��������� ������������� � LDAP.
             * @param {string} [auth] - ����� �������������� � ����������.
             * @returns {number} ���������� ��������� �������������.
             */

            "users.sync": function (fields, container, auth) {
                var data, list, unit, login, id, value, status, item, items,
                    field, flag, user, users = {}, count = 0, error = 0;

                // �������� ������������ �����
                if (!error) {// ���� ���� ������
                    fields = fields ? app.lib.str2obj(fields, false, app.val.delimKey, app.val.delimVal) : {};
                    for (var id in fields) {// ����������� �� ������ ���������� �����
                        value = fields[id].split("'").join("");
                        field = {// ������ ������ ����
                            name: value.split(app.val.delimFormat)[0],
                            format: value.split(app.val.delimFormat)[1]
                        };
                        fields[id] = field;
                    };
                    // ��������� ������� ������������ �����
                    flag = true;// �������� ��������
                    list = ["login", "firstname", "lastname", "mail"];
                    for (var i = 0, iLen = list.length; flag && i < iLen; i++) {
                        id = list[i];// �������� ��������� ������������� ��� ����
                        flag = flag && fields[id] && fields[id].name;
                    };
                    if (flag) {// ���� ���� ������������ ����
                    } else error = 1;
                };
                // �������� ������ ������������� ldap
                if (!error) {// ���� ���� ������
                    items = app.wsh.getLDAP(
                        "WHERE 'objectClass' = 'user'"
                        + " AND '" + fields["firstname"].name + "' = '*'"
                        + " AND '" + fields["lastname"].name + "' = '*'"
                        + " AND '" + fields["login"].name + "' = '*'"
                        + " AND '" + fields["mail"].name + "' = '*'",
                        container
                    );
                };
                // ����������� ������ ������������� ldap � ������
                for (var i = 0, iLen = items.length; !error && i < iLen; i++) {
                    item = items[i];// �������� ��������� �������
                    user = app.fun.item2user(item, fields);
                    if (user.login) {// ���� � ������������ ���� �����
                        login = user.login.toLowerCase();
                        users[login] = user;
                    } else error = 2;
                };
                // �������� ������ ������������� � ����������
                list = [app.val.stActive, app.val.stRegistered, app.val.stLocked];
                for (var items = [], i = 0, iLen = list.length; !error && i < iLen; i++) {
                    status = list[i];// �������� ��������� �������� ������� �� ������ ��������
                    for (var data = null; !data || data.total_count > data.offset; data.offset += data.limit) {
                        data = { offset: data ? data.offset : 0, status: status };// ������ ��� �������
                        data = app.api("get", "users", data);// ����������� ������ ����� api
                        if (!data.users) data.users = [];// �������� ������ � ������� ����
                        for (var j = 0, jLen = data.users.length; j < jLen; j++) {
                            item = data.users[j]// �������� ��������� �������
                            item.status = status;// ����� �������� �������
                            items.push(item);
                        };
                    };
                };
                // ��������� ������� �������������
                if (!error) {// ���� ���� ������
                    if (items.length) {// ���� ���� ������������
                    } else error = 3;
                };
                // ��������� ������ � ������������� ����������
                for (var i = 0, iLen = items.length; !error && i < iLen; i++) {
                    item = items[i];// �������� ��������� �������
                    login = item.login.toLowerCase();
                    user = users[login];// �������� ������������
                    if (user) {// ���� ������������ ���� � ldap
                        unit = app.lib.difference(user, item, function (one, two) {
                            return one.id == two.id && one.value != two.value;
                        });
                        if (unit) {// ���� ���������� �������� ������
                            if (auth) unit.auth_source_id = auth;
                            data = { user: unit };// ������ ��� �������
                            data = app.api("put", "users/" + item.id, data);
                            if (data.user) count++;// ����������� �������
                        };
                        delete users[login];
                    };
                };
                // ������������ ����� �������������
                if (!error) {// ���� ���� ������
                    for (var login in users) {// ����������� �� �������������
                        user = users[login];// �������� ������������
                        if (app.val.stActive == user.status) {// ���� �������� ������������
                            if (auth) user.auth_source_id = auth;
                            data = { user: user };// ������ ��� �������
                            data = app.api("post", "users", data);
                            if (data.user) count++;// ����������� �������
                        };
                        delete users[login];
                    };
                };
                // ���������� ���������
                return count;
            },

            /**
             * �������� ��� ������������ ������ � ���������� �������.
             * @param {number} [query] - ������������� ����������� ������� ��� ���� ��������.
             * @param {string} fields - ���������� ���� � �� �������� � ������� id:value;id:value � �������������.
             * @param {string} [filters] - �������������� ������ � ������� id:value;id:value � �������������.
             * @returns {number} ���������� ��������� �����.
             */

            "issues.change": function (query, fields, filters) {
                var key, value, filter, ids, keys, data, unit, flag, item, items,
                    count = 0, error = 0;

                // ������ ����������� �������
                ids = {// �������������� ���������������
                    project: "project_id",
                    tracker: "tracker_id",
                    status: "status_id",
                    priority: "priority_id",
                    author: "author_id",
                    assigned: "assigned_to_id",
                    category: "category_id",
                    start: "start_date",
                    due: "due_date",
                    done: "done_ratio",
                    private: "is_private",
                    estimated: "estimated_hours",
                    version: "fixed_version_id",
                    parent: "parent_issue_id"
                };
                keys = {// �������������� ������
                    start: "start_date",
                    due: "due_date",
                    done: "done_ratio",
                    private: "is_private",
                    estimated: "estimated_hours",
                    created: "created_on",
                    updated: "updated_on",
                    closed: "closed_on"
                };
                // �������� �������� ��� ���������� �����
                if (!error) {// ���� ���� ������
                    fields = fields ? app.lib.str2obj(fields, false, app.val.delimKey, app.val.delimVal) : null;
                    if (fields) {// ���� ������� �������� ������ ����� � �������� ��� �� ���������
                        for (var id in fields) {// ����������� �� ������ ���������� �����
                            value = fields[id].split('"').join("");
                            fields[id] = app.fun.str2val(value);
                        };
                    } else error = 1;
                };
                // �������� �������� ��� ��������
                if (!error) {// ���� ���� ������
                    filters = filters ? app.lib.str2obj(filters, false, app.val.delimKey, app.val.delimVal) : null;
                    if (filters) {// ���� ������� �������� ������ �������� � �������� ��� ���
                        for (var id in filters) {// ����������� �� ������ ���������� ��������
                            value = filters[id].split('"').join("");
                            filters[id] = app.fun.str2val(value);
                        };
                    };
                };
                // �������� ������ ����� � ����������
                if (!error) {// ���� ���� ������
                    for (var items = [], data = null; !data || data.total_count > data.offset; data.offset += data.limit) {
                        data = { offset: data ? data.offset : 0 };// ������ ��� �������
                        if (query) data.query_id = query;// ������ �� �������������� �������
                        data = app.api("get", "issues", data);// ����������� ������ ����� api
                        if (data.issues) items = items.concat(data.issues);
                    };
                };
                // ��������� �������� ��� ��������
                for (var i = 0, iLen = items.length; !error && i < iLen; i++) {
                    item = items[i];// �������� ��������� �������
                    for (var key in item) {// ����������� �� ������
                        unit = item[key];// ���������� ��������
                        key = keys[key] ? keys[key] : null;
                        if (key) item[key] = unit;
                    };
                    // ��������� ������ �� ������������ ��������
                    flag = true;// ������ ������������� ��������
                    if (filters) {// ���� ����� ��������� ������� � ������
                        for (var id in filters) {// ����������� �� �����
                            filter = filters[id];// �������� ��������� ��������
                            // �������� �������� �� ��������� ����
                            if (!isNaN(id)) {// ���� �������������� ����
                                flag = false;// ������ �� ������������� �������
                                list = item.custom_fields ? item.custom_fields : [];
                                for (var j = 0, jLen = list.length; !flag && j < jLen; j++) {
                                    unit = list[j];// �������� �������� ���������� ����
                                    flag = unit.id == Number(id);// ������� ��������
                                    if (flag) value = unit.value;
                                };
                            } else {// ���� �� �������������� ����
                                value = data = item;// ���� ������� ��� �������
                                list = id.split(app.val.delimId);// �������� ������� ������
                                for (var j = 0, jLen = list.length; flag && j < jLen; j++) {
                                    key = list[j];// �������� ��������� ����
                                    flag = key in data;// ������� ��������
                                    if (flag) value = data = data[key];
                                };
                            };
                            // ��������� �������� �� ������������ �������
                            if (flag) {// ���� ���� ��� ���������
                                if (app.lib.validate(filter, "string")) {// ���� � ������� ������
                                    filter = app.lib.template(filter, item);
                                };
                                flag = !app.lib.compare(value, filter);
                                if (!flag) {// ���� �� ������ �������� �� ������ ������������
                                    filter = "" + filter;// �������� � ������� ����
                                    value = "" + value;// �������� � ������� ����
                                    filter = filter.toLowerCase();// ��������� � ������ �������
                                    flag = ~value.toLowerCase().indexOf(filter);
                                };
                            };
                            // ��������� ���� �� ������ ��������
                            if (!flag) break;
                        };
                    };
                    // ������� ������ ��� ����������
                    if (flag) {// ���� ����� ����������� ������
                        unit = null;// ���������� ��������
                        for (var id in fields) {// ����������� �� �����
                            value = fields[id];// �������� ��������� ��������
                            if (app.lib.validate(value, "string")) {// ���� � ������� ������
                                value = app.lib.template(value, item);
                            };
                            id = ids[id] ? ids[id] : id;
                            if (!unit) unit = {};// ������ ������ ��� ������
                            // ����������� ��������
                            if (!isNaN(id)) {// ���� �������������� ����
                                if (!unit.custom_fields) unit.custom_fields = [];
                                unit.custom_fields.push({ id: id, value: value });
                            } else unit[id] = value;
                        };
                    };
                    // ��������� ������ � ������
                    if (flag) {// ���� ���������� �������� ������
                        data = { issue: unit };// ������ ��� �������
                        data = app.api("put", "issues/" + item.id, data);
                        if (data.issue) count++;// ����������� �������
                    };
                };
                // ���������� ���������
                return count;
            }
        },

        /**
         * ����������� ��������� �������������� � �����������.
         * @param {string} [method] - ����� http ��� �������.
         * @param {string} request - ����� uri ������� ��� ����������.
         * @param {object} [data] - ������ ������������ � �������.
         * @returns {object} ������ ������� ������� ����������.
         */

        api: function (method, request, data) {
            var xhr, url, flag, head, response = {}, error = 0;

            // ���������� ������������� ����������� ������
            if (!error) {// ���� ���� ������
                switch (method.toLowerCase()) {// ����������� ������
                    case "get": flag = false; break;
                    case "head": flag = false; break;
                    case "delete": flag = false; break;
                    default: flag = true;
                };
            };
            // ������������ ������������ ������
            if (!error && data && flag) {// ���� ����� ���������
                data = app.fun.obj2xml(data);
                if (data) {// ���� ������ ���������������
                } else error = 1;
            };
            // ������ ������ �� ������
            if (!error) {// ���� ���� ������
                url = app.val.apiUrl + request + ".xml";
                head = {// ��������� �������
                    "Cache-Control": "no-store",
                    "If-None-Match": "empty"
                };
                if (app.val.apiKey) {// ���� ����� ���� ��� api
                    head["X-Redmine-API-Key"] = app.val.apiKey;
                };
                xhr = app.lib.sjax(method, url, head, data);
                data = xhr.responseXML;
                if (app.lib.validate(data, 'xml')) {// ���� ����� �������
                } else error = 2;
            };
            // ������������ ���������� ������
            if (!error) {// ���� ���� ������
                data = app.fun.xml2obj(xhr.responseXML);
                if (data) {// ���� ������ ���������������
                    response = data;
                } else error = 3;
            };
            // ���������� ���������
            return response;
        },
        init: function () {// ������� ������������� ����������
            var value, key, flag, method, list = [], count = 0,
                index = 0, error = 0;

            // �������� ����� ��� �������� � api
            if (!error) {// ���� ���� ������
                if (index < wsh.arguments.length) {// ���� ������� ��������
                    value = wsh.arguments(index);// �������� ��������� �������
                    if (value) {// ���� �������� �� ������ ��������
                        key = "/";// ������������ ��������� ������ ��� �������� 
                        flag = key != value.substr(value.length - key.length);
                        if (flag) value += key;// ��������� ���������
                        app.val.apiUrl = value;
                    } else error = 2;
                } else error = 1;
                index++;
            };
            // �������� ���� ��� �������� � api
            if (!error) {// ���� ���� ������
                if (index < wsh.arguments.length) {// ���� ������� ��������
                    value = wsh.arguments(index);// �������� ��������� �������
                    if (value) {// ���� �������� �� ������ ��������
                        app.val.apiKey = value;
                    } else error = 4;
                } else error = 3;
                index++;
            };
            // �������� ������������� ������
            if (!error) {// ���� ���� ������
                if (index < wsh.arguments.length) {// ���� ������� ��������
                    value = wsh.arguments(index);// �������� ��������� �������
                    method = app.method[value];// �������� ������� ������
                    if (method) {// ���� ����� ��������������
                    } else error = 6;
                } else error = 5;
                index++;
            };
            // ��������� ������ ���������� ��� ������ ������
            if (!error) {// ���� ���� ������
                for (var i = index, iLen = wsh.arguments.length; i < iLen; i++) {
                    value = wsh.arguments(i);// �������� ��������� ��������
                    list.push(value);// ��������� �������� � ������
                };
            };
            // ��������� �������������� �����
            if (!error) {// ���� ���� ������
                count = method.apply(app, list);
            };
            // ��������� �������� �����
            value = error ? -1 * error : count;
            wsh.quit(value);
        }
    });
})(readmine, WSH);

// �������������� ����������
readmine.init();