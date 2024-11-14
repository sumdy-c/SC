/**
 * Хранилище состояний
 */
const SCprovider = new Set();

/**
 * Класс для управлением, валидацией и применением "Правил SC"
 */
class SCRules {
	/**
	 *  Объект SC
	 */
	SC;
	/**
	 * Получаемые инструкции
	 */
	instruction;
	/**
	 * Правила SC
	 */
	rules;
	/**
	 * Обработанные правила SC
	 */
	safetyRules;

	/**
	 * Конструктор правил SC
	 * @param { SC } sc Родительский компонент
	 */
	constructor(sc) {
		this.SC = sc;
		this.instruction = [];
		this.safetyRules = [];
	}

	/**
	 * Инициализирует инструкцию
	 * @param { SCcss } instruction
	 */
	add_instruction(instruction) {
		this.instruction.push(instruction);
		this.validateRules();
	}

	/**
	 * NEW! Обновленная функция для парсинга правил из документа css
	 * @param { str } invalid_string
	 * @returns object
	 */
	parseStringToObject(invalid_string) {
		let str = invalid_string.replace('{', '').replace('}', '');
		const cssObject = {};
		const declarations = str.split('],');

		for (let i = 0; i < declarations.length; i++) {
			let item = declarations[i];
			let first_step = item.split('=');
			let two_step = first_step[1].split('[');
			let tree_step = two_step[1].split(',');
			let cssObj = {};
			cssObj[two_step[0]] = {};

			tree_step.map((css) => {
				css = css.replaceAll(']', '').split(':');
				cssObj[two_step[0]][css[0]] = css[1];
			});

			cssObject[first_step[0]] = cssObj;
		}
		return cssObject;
	}

	/**
	 * Конвертирует правила SС для работы с ними
	 * @param { SCrules } входящий набор правил
	 * @returns Валидированное исходящее значение, для построения возможных правил
	 */
	convertSCRulesToJS(input) {
		const res = input
			.replaceAll('\n', '')
			.replaceAll(' ', '')
			.match(/{([^}]+)}/)[0];

		return this.parseStringToObject(res);
	}

	/**
	 * Подготовка для мутирования правил css
	 * @param { string } noValcssString приходящий текст
	 * @returns TextCSS to ObjectJs
	 */
	cssStringToObject(noValcssString) {
		const cssString = noValcssString.replace('{', '').replace('}', '');
		const cssObject = {};
		const properties = cssString.split(';');

		for (const property of properties) {
			if (property.trim() !== '') {
				const [key, value] = property.split(':').map((part) => part.trim());
				cssObject[key] = value;
			}
		}

		return cssObject;
	}

	/**
	 * Подготовка текста перед загрузкой в область документа
	 */
	createNewStyleText(cssObj) {
		let result = '';

		Object.entries(cssObj).forEach((item) => {
			result = result + `${item.join(':')};`;
		});
		return result;
	}

	/**
	 * Заменяет указаное в SC .css свойство в классе.
	 * @param { string } rule Пользовательское правило
	 */
	goRulesReplacer(rule) {
		for (let sc_rul in this.rules[rule]) {
			this.SC.CSSdocumentsClasses.map((cls) => {
				if (cls.hasOwnProperty('originalClass')) {
					if (cls.originalClass === sc_rul) {
						const indexReplacment = Array.from(this.SC.SCStyleSheet.cssRules).findIndex((cssItem) => {
							return cssItem.selectorText === cls.selectorText;
						});
						const oldCSS = this.SC.SCStyleSheet.cssRules[indexReplacment].cssText.match('{(.*?)}')[0];
						const propsCSS = this.cssStringToObject(oldCSS);

						Object.keys(this.rules[rule][sc_rul]).forEach((newCss) => {
							propsCSS[newCss] = this.rules[rule][sc_rul][newCss];
						});

						this.createNewStyleText(propsCSS);

						this.SC.SCStyleSheet.deleteRule(indexReplacment);
						this.SC.SCStyleSheet.insertRule(`${cls.selectorText}{${this.createNewStyleText(propsCSS)}}`, 0);
					}
				}
			});
		}
	}

	/**
	 * Применяет SC правило для выбранных элементов поверх классов. Изменения будут применены в inline style, для максимизации приоритетности изменённых свойств
	 * @param { string } rule
	 */
	goRulesFormedInline(rule) {
		let currentRules;
		this.safetyRules.forEach((saveRule) => {
			if (saveRule.rule === rule) {
				currentRules = saveRule.styledName;
			}
		});

		for (let sc_rul in this.rules[rule]) {
			let styledName = currentRules;

			if (!styledName) {
				styledName = rule + this.SC.uuidv4();
				this.safetyRules.push({ rule, styledName });
				/** Добавляем в схему для контролируемого мутирования стилей */
				this.SC.tableStyleSheet.push({
					name: styledName,
					styleCSS: this.rules[rule][sc_rul],
					log: `Сформирован от класса "${sc_rul}"`,
				});
				this.SC.stylesScheme[styledName] = this.rules[rule][sc_rul];
			}

			this.SC.stylize(sc_rul).each((_, selector) => {
				this.SC.stylize(selector, styledName);
			});
		}
	}

	/**
	 * Отчистка от правил общего потока учета таблиц стилей
	 */
	safeTables() {
		this.SC.document_style.forEach((indexStyleSheet) => {
			const indexRule = Array.from(document.styleSheets[indexStyleSheet].cssRules).findIndex((item) => {
				return item.selectorText === 'sc_rules';
			});
			document.styleSheets[indexStyleSheet].deleteRule(indexRule);
		});
	}

	/**
	 * Валидирует значения свойств
	 */
	validateRules() {
		this.instruction.forEach((rules) => {
			if (!rules.cssText.trim() === '') {
				console.error(
					'[SC(rules)] Не удалось идентифицировать правила, возможно вы забыли указать исполняемые команды ?'
				);
				return;
			}
			const result = this.convertSCRulesToJS(rules.cssText.trim());
			this.rules = result;
		});
		this.safeTables();
	}
}

/**
 * Класс для формирования экземпляра состояния SC и добавления примесей
 */
class SCS {
	/**
	 * Экземпляр состояния
	 */
	instance;
	/**
	 * Значение состояния, не влияющее на прокси, для безопасного получения
	 */
	save_value;
	/**
	 * Определение, является ли интерфейс новой инструкцией SC
	 */
	version = '2.0.0';
	/**
	 * Флаг SCS который применит функции SCmove при наличии вводного значения
	 */
	action = false;

	/**
	 * Cозданиe состояния для использования активностей SC
	 * @param { any } value значение по умолчанию
	 * @returns
	 */
	constructor(value) {
		if (value !== undefined) {
			this.action = true;
		}
		this.save_value = value;
		this.instance = { value: value };
		return this;
	}

	/**
	 * Сеттер изменения состояния SC
	 * @param { any } new_value новое значение состояния
	 */
	set(new_value) {
		this.set_save(new_value);
		this.instance.value.value = new_value;
	}

	set_save(val) {
		this.save_value = val;
	}

	go() {
		this.instance.value.value = this.save_value;
	}

	/**
	 * Геттер получения состояния SC
	 */
	get() {
		return this.save_value;
	}
}

/**
 * Сущность определяющая функциональность активностей SC стилей.
 */
class SCmove {
	/**
	 * Состояние вхождения
	 */
	state;
	/**
	 * Список сохранённых состояний
	 */
	states;
	/**
	 * Проксируемое значение отсылающие к прокси
	 */
	valueState;
	/**
	 * Объект прокси
	 */
	proxyState;
	/**
	 * Итератор для создания уникальных ключей
	 */
	safeIterator;
	/**
	 * Пользовательская SC функция
	 */
	personfn;
	/**
	 * Изменяемый стиль переданный аргументом
	 */
	saveMoveClass;
	/**
	 * Переданный аргументом селектор
	 */
	saveMoveSel;
	/**
	 * @deprecated
	 * @deprecated
	 * Модификация SCmove для манипуляции над элементами с помощью проксирования
	 */
	toggleMod;

	/**
	 * Инициализация SCmove
	 */
	constructor() {
		this.states = new Set();
	}

	/**
	 * Предоставляет прокси, для мутирования
	 * @param {service} o Оригинальный объект
	 * @param {service} fn Функция немедленого вызова
	 * @param {service} path Неопределенный путь
	 * @returns Объект проксирования на оригинальный объект
	 */
	stateProxy(o, fn, path) {
		let tree = {};
		if (!path) {
			path = 'obj';
		}
		const proxySC = new Proxy(o, {
			get: (_, prop) => {
				if (typeof o[prop] != 'object') {
					return o[prop];
				}
				if (tree[prop] === undefined) {
					tree[prop] = this.stateProxy(o[prop], fn, `${path}.${prop}`);
				}
				return tree[prop];
			},
			set: (_, prop, val) => fn(val, prop, proxySC, o[prop]) || 1,
		});
		return proxySC;
	}

	/**
	 * Функция немедленного вызова при изменений проксируемого объекта
	 * @param {service} val приходящее новое значение
	 */
	action = (val, arg, arg1, arg2) => {
		this.states.forEach((item) => {
			if (arg1 === item.proxyState.value) {
				item.selectors.forEach((sel) => {
					if (item.state.value !== val || sel.noCheck || sel.fastStart) {
						sel.fastStart = false;
						if (item.toggle) {
							if (Array.isArray(val)) {
								val.forEach((instruction) => {
									this.personfn(sel.target, instruction);
								});
							} else if (val === '*empty') {
								$(sel.target).empty();
							} else if (val === '*remove') {
								$(sel.target).remove();
							} else {
								return this.personfn(sel.target, val);
							}
						} else {
							this.personfn(sel.target, sel.SCstyle(val));
						}
					}
				});

				if (typeof val === 'object') {
					val = JSON.stringify(val);
				}
				item.state.value = val;
				item.fastStart = false;
			}
		});
	};

	/**
	 * Создания контролируемого списка для реализации хранилища состояний
	 * @param { any } arg значение инициализации
	 * @returns { void } список состояний
	 */
	controlState(arg, mod, noCheck, SCS) {
		let key = Date.now() + this.safeIterator;
		if (this.states.size === 0) {
			this.states.add({
				state: this.state,
				key: key,
				selectors: [
					{ target: this.saveMoveSel, SCstyle: this.saveMoveClass, fastStart: SCS.action, noCheck: noCheck },
				],
				proxyState: this.proxyState,
				toggle: mod,
			});
			return;
		}
		let checkState = false;

		this.states.forEach((item) => {
			if (item.proxyState === arg) {
				checkState = true;
				item.selectors.push({
					target: this.saveMoveSel,
					SCstyle: this.saveMoveClass,
					fastStart: SCS.action,
					noCheck: noCheck,
				});
			}
		});

		if (!checkState) {
			this.states.add({
				state: this.state,
				key: key,
				selectors: [
					{ target: this.saveMoveSel, SCstyle: this.saveMoveClass, fastStart: SCS.action, noCheck: noCheck },
				],
				proxyState: this.proxyState,
				toggle: mod,
			});
			return;
		}
	}

	/**
	 * Создание состояния.
	 * @param { any } arg приходящее значение
	 */
	create(arg, mod, noCheck, SCS) {
		this.valueState = this.stateProxy(this.state, this.action, this.valueState);
		this.safeIterator++;
		this.controlState(arg, mod, noCheck, SCS);
		arg.value = this.valueState;
	}

	/**
	 * Функция первого вхождения для инициализации создания состояний
	 * @param {*} arg Значение инициализации
	 * @param {*} selector Контролируемый селектор
	 * @param {*} SCclass Применяемый стиль
	 * @param {*} SCmain Объект основной SC библиотеки
	 */
	move(arg, selector, SCclass, SCmain, noCheck, SCS) {
		this.state = {
			value: arg.value,
		};

		this.valueState = {
			value: null,
		};

		this.proxyState = arg;

		this.safeIterator = 0;

		this.saveMoveSel = selector;

		!SCclass ? (this.saveMoveClass = undefined) : (this.saveMoveClass = SCclass);

		this.personfn = (sel, scclass) => {
			SCmain.stylize($(sel), scclass);
		};

		if (noCheck === undefined) {
			noCheck = false;
		}
		this.create(arg, !SCclass, noCheck, SCS);
	}
}

/**
 * Классовый компонент для упрощения стилизации, организации безопасности и мутации стилей.
 */
class SC {
	/**
	 * Название и год разработки библиотеки, для разного
	 */
	commercialName = 'SC library | 2023';
	/**
	 * Пользовательская таблица стилей
	 */
	tableStyleSheet;

	/**
	 * Схема стилизации SC
	 */
	stylesScheme;

	/**
	 * Пользовательские темы
	 */
	SCrules;

	/**
	 * Отслеживаемые документы CSS
	 */
	CSSfiles;

	/**
	 * Найденные CSS классы
	 */
	CSSdocumentsClasses;

	/**
	 * Идентификатор созданого SC экземпляра
	 */
	SCid;

	/**
	 * Объект настройки SC
	 * onlyS - только s ( bool )
	 * offWarn - выключить предупреждения ( bool )
	 * deleteNativeCSS - удалить исходный CSS из документа ( bool )
	 */
	settingSC;

	/**
	 * История взаимодействия с SC
	 */
	history;

	/**
	 * Ссылка на область контроля css в пространстве документа
	 */
	document_style;

	/**
	 *	Таблица стилей созданная SC
	 */
	SCStyleSheet;

	/**
	 *  Настройка и инициализация SC
	 */
	constructor(param) {
		this.settingSC = { init: 'disable' };
		this.tableStyleSheet = [];
		this.document_style = [];
		this.stylesScheme = {};
		this.CSSdocumentsClasses = [];
		this.history = [];
		if (param) {
			this.settingSC = param;
			this.settingSC.init = 'enable';
		}
	}

	/**
	 * Генерируемый уникальный идентификтор
	 */
	uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	/**
	 * Получить информацию и просмотреть историю
	 * @param { string } param log - посмотреть историю в виде лога. console - вывести историю в консоль
	 */
	viewHistory(param) {
		switch (param) {
			case 'log':
				return this.history;
			case 'console':
				this.history.forEach((item) => {
					console.log(
						`SC_LOG | ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()} - ${item}`
					);
				});
				return;
		}
	}

	/**
	 * Создаёт случайное значение для мутирования класса
	 * @returns { string } рандомное значение
	 */
	generateRandomValue() {
		var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var length = 6;
		var randomValue = '';

		for (var i = 0; i < length; i++) {
			var randomIndex = Math.floor(Math.random() * characters.length);
			randomValue += characters.charAt(randomIndex);
		}

		return randomValue;
	}

	/**
	 * Функция для проверки повторений css классов в доверенных SC файлах
	 * @param { array } arr массив стилей для проверки
	 * @param {*} resparr результирующий массив, хранящий в себе дублируемое значение классов
	 */
	hasDuplicatesClassCSS(arr, resparr) {
		return arr.some(function (currentObj, index) {
			return arr.some(function (obj, i) {
				if (i !== index && obj.selectorText === currentObj.selectorText) {
					resparr.push(currentObj.selectorText);
				}
			});
		});
	}

	/**
	 * Создаёт css класс и помещает его на страницу
	 * @param { string } className
	 * @param { string } styles
	 */
	createCssNode() {
		// новая реализация
		this.SCStyleSheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [this.SCStyleSheet];

		// Старая реализация ( возможно стоит включить для поддержки старых браузеров )
		// const styleElement = document.createElement('style');
		// styleElement.type = 'text/css';
		// styleElement.title = this.commercialName;
		// document.head.appendChild(styleElement);
	}

	/**
	 * Инициализирует область видимости и стилизацию на странице
	 */
	initCSSClass() {
		const initStyleze = Array.from(document.styleSheets);
		const styleArr = [];
		this.CSSfiles.forEach((userCss) => {
			styleArr.push(
				initStyleze.find((item) => {
					if (item.href && item.href.match(/\/([^\/]+\.css)$/)) {
						return item.href.match(/\/([^\/]+\.css)$/)[1] === userCss;
					}
				})
			);
			this.document_style.push(
				initStyleze.findIndex((item) => {
					if (item.href && item.href.match(/\/([^\/]+\.css)$/)) {
						return item.href.match(/\/([^\/]+\.css)$/)[1] === userCss;
					}
				})
			);
		});

		const checkInstructionsRules = (noValCSSObj) => {
			if (noValCSSObj.selectorText.includes('sc_rules')) {
				return true;
			}
			return false;
		};

		styleArr.forEach((noValidStyle) => {
			Array.from(noValidStyle.rules).forEach((noValidClasses, index) => {
				try {
					const noValCSSObj = {};
					noValCSSObj.selectorText = noValidClasses.selectorText;
					noValCSSObj.cssText = noValidClasses.style.cssText;
					if (checkInstructionsRules(noValCSSObj)) {
						this.SCrules.add_instruction(noValCSSObj);
					} else {
						this.CSSdocumentsClasses.push(noValCSSObj);
						if (this.settingSC) {
							if (this.settingSC.deleteNativeCSS) {
								noValidStyle.deleteRule(0);
							}
						}
					}
				} catch (e) {}
			});
		});

		const valStyleArr = [];
		this.hasDuplicatesClassCSS(this.CSSdocumentsClasses, valStyleArr);
		if (valStyleArr.length > 1) {
			if (this.settingSC) {
				if (!this.settingSC.offWarn) {
					console.warn(
						`[SC] Обнаружено дублирование CSS классов! Обратите внимание, что это может привести к неправильному поведению страницы`
					);
					console.warn(`[SC] Дубли ${valStyleArr.join(', ')}`);
				}
			} else {
				console.warn(
					`[SC] Обнаружено дублирование CSS классов! Обратите внимание, что это может привести к неправильному поведению страницы`
				);
				console.warn(`[SC] Дубли ${valStyleArr.join(', ')}`);
			}
		}
	}

	/**
	 * Удаляет класс по переданому селектору и названию класса
	 * @param { object } sel
	 * @param { string } cssClass
	 */
	removeStyledComponentClasses(sel, cssClass) {
		const rmClass = cssClass.replace('-', '.');
		this.CSSdocumentsClasses.map((cls) => {
			if (cls.hasOwnProperty('originalClass')) {
				if (cls.originalClass === rmClass) {
					$(sel).removeClass(cls.selectorText.substring(1));
				}
			}
		});
	}

	/**
	 * Добавляет класс по переданному селектру и названию класса
	 * @param { object } sel Селектор, для добавления
	 * @param { string } cssClass Название класса
	 */
	styledComponentClasses(sel, cssClass) {
		let noCreate = false;
		function modifyClassNames(cssArray, oldClassName, newClassName) {
			cssArray.forEach(function (cssObj) {
				cssObj.originalClass = cssObj.selectorText;
				cssObj.selectorText = cssObj.selectorText.replace(oldClassName, newClassName);
			});
			return cssArray;
		}

		const CSSInit = [];
		this.CSSdocumentsClasses.map((cls) => {
			if (cls.hasOwnProperty('originalClass')) {
				if (cls.originalClass === cssClass) {
					$(sel).addClass(cls.selectorText.substring(1)).attr('SC', this.SCid);
					noCreate = true;
				}
			}

			if (cls.selectorText.includes(cssClass)) {
				CSSInit.push(cls);
			}
		});

		if (noCreate) {
			return;
		}

		if (CSSInit.length === 0) {
			if (this.settingSC) {
				if (!this.settingSC.offWarn) {
					console.warn(
						`[SC] Не удалось найти CSS класс. Возможно вы не подключили файл в отслеживание SC или опечатались.`
					);
					console.warn(`[SC] Проблема была обнаружена с - ${cssClass}`);
				}
			} else {
				console.warn(
					`[SC] Не удалось найти CSS класс. Возможно вы не подключили файл в отслеживание SC или опечатались.`
				);
				console.warn(`[SC] Проблема была обнаружена с - ${cssClass}`);
			}
			return;
		}

		const newCSSName = `.SC_${cssClass.substring(1)}-${this.generateRandomValue()}`;
		const modifiedCssArray = modifyClassNames(CSSInit, cssClass, newCSSName);

		// ( возможно стоит включить для поддержки старых браузеров )
		// const indexSCTables = Array.from(document.styleSheets).findIndex((item) => {
		// 	return item.title === this.commercialName;
		// });

		modifiedCssArray.forEach((stylerCSS) => {
			this.SCStyleSheet.insertRule(`${stylerCSS.selectorText} {${stylerCSS.cssText}}`, 0);

			// ( возможно стоит включить для поддержки старых браузеров )
			// document.styleSheets[indexSCTables].insertRule(`${stylerCSS.selectorText} {${stylerCSS.cssText}}`, 0);
		});

		$(sel).addClass(newCSSName.substring(1)).attr('SC', this.SCid);
	}

	/**
	 * Выдача стиля из хранилища
	 * @param {string} name имя "класса" по которому нужны стили
	 * @returns стили по имени
	 */
	styledComponent(name) {
		if (!this.tableStyleSheet || !this.tableStyleSheet.length) {
			console.error(
				'Невозможно вернуть стили, так как они не были зарегестрированы SC компонентом! Проверьте правильность добавления таблицы!'
			);
			return null;
		}
		let currentStyle;

		this.tableStyleSheet.map((style) => {
			if (style.name === name) {
				currentStyle = style.styleCSS;
			}
		});
		if (!currentStyle) {
			console.error(
				`[SC] Не удалось вернуть стили, проверьте правильность введёного названия класса sc, или наличие стиля в переданной таблице!`
			);
			console.error(`[SC] Полученные данные названия стиля - ${name}`);
			return null;
		}
		return currentStyle;
	}

	/**
	 * Использовать правило SC
	 * @param { string } rule правило
	 * @param { boolean | undefined } replace свойство отвечающее за наложение или замещения свойств
	 */
	rules(rule, replace) {
		if (replace === undefined) {
			replace = true;
		}

		if (Array.isArray(rule)) {
			rule.forEach((rul) => {
				if (replace) {
					this.SCrules.goRulesReplacer(rul);
				} else {
					this.SCrules.goRulesFormedInline(rul);
				}
			});
			return;
		}

		if (replace) {
			this.SCrules.goRulesReplacer(rule);
		} else {
			this.SCrules.goRulesFormedInline(rule);
		}
	}

	createElementCheck(val) {
		const invalid_HTML = ['HTML', 'BASE', 'HEAD', 'LINK', 'META', 'STYLE', 'TITLE', 'BODY', 'SHADOW'];
		const valid_HTML =
			'ADDRESS,ARTICLE,ASIDE,FOOTER,HEADER,H1,H2,H3,H4,H5,H6,HGROUP,MAIN,NAV,SECTION,SEARCH,BLOCKQUOTE,DD,DIV,DL,DT,FIGCAPTION,FIGURE,HR,LI,MENU,OL,P,PRE,UL,A,ABBR,B,BDI,BDO,BR,CITE,CODE,DATA,DFN,EM,I,KBD,MARK,Q,RP,RT,RUBY,S,SAMP,SMALL,SPAN,STRONG,SUB,SUP,TIME,U,VAR,WBR,AREA,AUDIO,IMG,MAP,TRACK,VIDEO,EMBED,IFRAME,OBJECT,PICTURE,PORTAL,SOURCE,SVG,MATH,CANVAS,NOSCRIPT,SCRIPT,DEL,INS,CAPTION,COL,COLGROUP,TABLE,TBODY,TD,TFOOT,TH,THEAD,TRBUTTON,DATALIST,FIELDSET,FORM,INPUT,LABEL,LEGEND,METER,OPTGROUP,OPTION,OUTPUT,PROGRESS,SELECT,TEXTAREA,DETAILS,DIALOG,SUMMARY,SLOT,TEMPLATE,ACRONYM,BIG,CENTER,CONTENT,DIR,FONT,FRAME,FRAMESET,IMAGE,MARQUEE,MENUITEM,NOBR,NOEMBED,NOFRAMES,PARAM,PLAINTEXT,RB,RTC,STRIKE,TT,XMP';
		if (invalid_HTML.includes(val)) {
			console.error(
				`SC | Использовать метаданные документа и корень раздела не позволяется. Проблема возникла с ${val}, может в хотели найти этот элемент ? Напишите его без использования КАПСа`
			);
			return false;
		}

		if (valid_HTML.includes(val)) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Проверка валидности создания элементов синтаксисом большой буквы
	 */
	hasCapital = (s) => !/^[a-zа-я\d]*$/.test(s);

	/**
	 * Функция для обработки селекторов заданной стилизацией
	 * @param { JQselector } selector селектор, к которому нужно привязать стили
	 * @param { string } stylesClass имя по которому должны вернуть стили
	 * @returns Стилизованный селектор
	 */
	stylize = (selector, stylesClass) => {
		if (selector === '*rules') {
			return this;
		}

		if (!stylesClass) {
			let styledSelector;
			
			if (this.createElementCheck(selector)) {
				if (this.hasCapital(selector) && selector[0] !== '.') {
					styledSelector = $(`<${selector.toLowerCase()}>`).attr('SC', this.SCid);
				}
				this.history.push({ mes: `Cоздание`, selector: styledSelector });
				return styledSelector;
			} else {
				styledSelector = $(selector);
			}

			if (styledSelector.length === 0) {
				this.CSSdocumentsClasses.map((cls) => {
					if (cls.hasOwnProperty('originalClass')) {
						if (cls.originalClass === selector) {
							styledSelector = $(cls.selectorText);
							this.history.push({ mes: `Поиск`, selector: styledSelector });
							return styledSelector;
						}
					}
				});
			}
			this.history.push({ mes: `Cоздание`, selector: styledSelector });
			$(styledSelector).attr('SC', this.SCid);
			return styledSelector;
		}

		let styledSelector;
		if (this.createElementCheck(selector)) {
			if (this.hasCapital(selector) && selector[0] !== '.') {
				styledSelector = $(`<${selector.toLowerCase()}>`);
			} else {
				styledSelector = $(selector);
			}

			if (styledSelector.length === 0) {
				this.CSSdocumentsClasses.map((cls) => {
					if (cls.hasOwnProperty('originalClass')) {
						if (cls.originalClass === selector) {
							styledSelector = $(cls.selectorText);
						}
					}
				});
			}
		} else {
			styledSelector = $(selector);
		}

		if (stylesClass[0] === '.') {
			this.styledComponentClasses(styledSelector, stylesClass);

			this.history.push({ mes: `Добавлен класс ${stylesClass}`, selector: styledSelector });

			return styledSelector;
		} else if (stylesClass[0] === '-') {
			this.history.push({ mes: `Удалён класс ${stylesClass}`, selector: styledSelector });

			this.removeStyledComponentClasses(styledSelector, stylesClass);
			return styledSelector;
		} else if (stylesClass === '!line') {
			this.history.push({ mes: `Удалёны все стили`, selector: styledSelector });

			styledSelector.removeAttr('style');
			return styledSelector;
		} else if (stylesClass === '!class') {
			this.history.push({ mes: `Удалёны все классы`, selector: styledSelector });

			styledSelector.removeClass();
			return styledSelector;
		} else if (stylesClass === '*remove') {
			this.history.push({ mes: `Удалён селектор`, selector: styledSelector });

			styledSelector.remove();
			return null;
		} else if (stylesClass === '*empty') {
			this.history.push({ mes: `Удалены все дети у селектора`, selector: styledSelector });
			styledSelector.empty();
			return styledSelector;
		} else if (Array.isArray(stylesClass)) {
			stylesClass.forEach((instruction) => {
				this.stylize(styledSelector, instruction);
			});
			return styledSelector;
		} else {
			styledSelector.removeAttr('style');
			const scStyle = this.styledComponent(stylesClass);
			$(styledSelector).css(scStyle).attr('SC', this.SCid);
			this.history.push({ mes: `Добавлен inline style SC`, selector: styledSelector });
			return styledSelector;
		}
	};

	/**
	 * Проверка на дублирования стилей (инлайн)
	 * @param { arr } arrStyle массив стилей
	 * @returns { boolean } результат проверки в булевом эквиваленте
	 */
	testDuplicates(arrStyle) {
		const duplicates = [];
		for (let i = 0; i < arrStyle.length; i++) {
			for (let j = i + 1; j < arrStyle.length; j++) {
				if (arrStyle[i].name === arrStyle[j].name && !duplicates.includes(arrStyle[i].name)) {
					duplicates.push(arrStyle[i].name);
				}
			}
		}

		if (duplicates.length) {
			console.error(
				'[SC] Обнаружено дублирование элементов! Вы можете использовать одинаковые имена классов sc в разных пространствах имён, но не в одном!'
			);
			console.error(`[SC] Повторения имён: ${duplicates.join(', ')}`);
			return false;
		}

		for (let i = 0; i < arrStyle.length; i++) {
			for (let j = i + 1; j < arrStyle.length; j++) {
				if (
					JSON.stringify(arrStyle[i].styleCSS) === JSON.stringify(arrStyle[j].styleCSS) &&
					!duplicates.includes(JSON.stringify(arrStyle[i].styleCSS))
				) {
					duplicates.push(arrStyle[i].name);
				}
			}
		}

		if (duplicates.length) {
			if (this.settingSC) {
				if (!this.settingSC.offWarn) {
					console.warn(
						'[SC] Обнаружено дублирование элементов! Обратите внимание, дублирование контента в стилях не является ошибкой, но это считается плохой практикой'
					);
					console.warn(`[SC] Повторения имён: ${duplicates.join(', ')}`);
				}
			} else {
				console.warn(
					'[SC] Обнаружено дублирование элементов! Обратите внимание, дублирование контента в стилях не является ошибкой, но это считается плохой практикой'
				);
				console.warn(`[SC] Повторения имён: ${duplicates.join(', ')}`);
			}
		}
		return true;
	}

	/**
	 * Инициализация SC, для передачи массива инлайн стилизации и файлов для считывания css
	 * @param { Array<{
	 *  name: string,
	 *  styleCSS: {
	 *      display: string,
	 *      margin: string,
	 *      padding: string,
	 *      background: string,
	 *      border: string,
	 *      position: string,
	 *      opasity: string,
	 *      color: string,
	 *  }
	 * }> } tableStyleSheet Структуризированый массив строковой стилизации
	 * @param { string[] } classesStyleSheet массив названия файлов !С РАСШИРЕНИЕМ!
	 * @returns { Function } функция для стилизации селектора по переданной таблице стилей
	 */
	use(tableStyleSheet, classesStyleSheet) {
		/**
		 * Проверка на дублирование классовSC
		 */
		if (!this.testDuplicates(tableStyleSheet)) {
			return;
		}
		this.tableStyleSheet = tableStyleSheet;
		this.CSSfiles = classesStyleSheet;
		this.SCrules = new SCRules(this);
		this.initCSSClass();
		this.createCssNode();
		this.tableStyleSheet.map((item) => {
			this.stylesScheme[item.name] = item.styleCSS;
		});

		this.SCid = (Date.now() / 28).toFixed(0) + this.generateRandomValue();
		this.SCmove = new SCmove();
		SCprovider.add(this);
		this.goSC();

		if (this.settingSC) {
			if (this.settingSC.onlyS) {
				return this.stylize.bind(this);
			} else {
				return [this.stylize.bind(this), this];
			}
		}
		return [this.stylize.bind(this), this];
	}

	/**
	 * Использовать функционал активностей SC
	 * @param { SC } sc instance SC
	 */
	goSC = () => {
		/**
		 * Создание глобальных функций, только раз на страницу
		 */
		if (SCprovider.size > 1) {
			return;
		}

		/**
		 * Если не передавать второй аргумент, значение состояние будет использовано как инструкция для стилизации
		 * @param { object } arg переменная для проксирования на неё состояния
		 * @param { * } SCclass Изменяемый стиль
		 * @returns селектор
		 */
		$.fn.SCmove = function (arg, SCclass, noCheck) {
			if (!$(this).attr('sc')) {
				console.error(
					`[SC] Вы пытаетесь назначить обработчик SC, на компонент который не был им зарегистрирован! Проверьте селектор к которому вы пытаетесь применить функции SC!`
				);
				console.error(arg);
				console.error(this);
				return;
			}

			let self;
			SCprovider.forEach((sc) => {
				if ($(this).attr('sc') === sc.SCid) {
					self = sc;
				}
			});

			if (arg.version === '2.0.0') {
				self.SCmove.move(arg.instance, $(this), SCclass, self, noCheck, arg);
				if (arg.action) {
					arg.go();
				}
				return this;
			}
		};

		$.fn.SCadd = function (SCclass) {
			if (!$(this).attr('sc')) {
				console.error(
					`[SC] Вы пытаетесь назначить обработчик SC, на компонент который не был им зарегистрирован! Проверьте селектор к которому вы пытаетесь применить функции SC!`
				);
				console.error(arg);
				console.error(this);
				return;
			}
			let self;
			SCprovider.forEach((sc) => {
				if ($(this).attr('sc') === sc.SCid) {
					self = sc;
				}
			});
			self.stylize(this, SCclass);
			return this;
		};

		$.fn.SChasClass = function (SCclass) {
			if (!$(this).attr('sc')) {
				console.error(
					'[SC] Вы пытаетесь проверить обработчик SC, на компонент который не был им зарегистрирован! Проверьте селектор к которому вы пытаетесь применить функции SC!'
				);
				return;
			}

			let self;
			let resultCheck = false;
			SCprovider.forEach((sc) => {
				if ($(this).attr('sc') === sc.SCid) {
					self = sc;
				}
			});

			self.CSSdocumentsClasses.map((cls) => {
				if (cls.hasOwnProperty('originalClass')) {
					if (cls.originalClass === SCclass) {
						if ($(this).hasClass(cls.selectorText.substring(1))) {
							resultCheck = true;
						}
					}
				}
			});
			return resultCheck;
		};
	};
}
