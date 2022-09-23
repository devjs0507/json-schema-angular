import {
  Component, OnInit, Input, Output, EventEmitter, SimpleChanges,
  OnChanges, ComponentFactoryResolver, ViewChild, ViewChildren, QueryList, Inject
} from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, ReplaySubject } from 'rxjs';
import { KeyValue } from '@angular/common';
import { Schema } from './schema';
import { WidgetComponent } from './widget.component';
import { WidgetDirective } from './widget.directive';
import { JsonSchemaFormService } from './json-schema-form.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { FormControl } from '@angular/forms';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { MatChipInputEvent } from '@angular/material/chips';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { COMMA, ENTER, TAB } from '@angular/cdk/keycodes';
import { DefaultChoiceHandler } from './choice';

/**
 * generates an input form base on JSON schema and JSON object.
 * The component is used recursively.
 */
@Component({
  selector: 'ca-json-schema-form',
  templateUrl: './json-schema-form.component.html',
  styleUrls: ['./json-schema-form.component.css']
})
export class JsonSchemaFormComponent implements OnInit, OnChanges {

  /**
   * component constructor
   * @param componentFactoryResolver    allows dynamic components
   * @param service                     application service for registering components etc.
   * 
   */
  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    public service: JsonSchemaFormService) { }

  /**
   * container children for event propagation
   */
  @ViewChildren('children') children: QueryList<JsonSchemaFormComponent>;

  /**
   * container children for event propagation
   */
  @ViewChild('child') child: JsonSchemaFormComponent;

  /**
   * if an array is displayed, indicates which array index is being hovered over in order to
   * display the "-" remove button
   */
  hover: number;

  /**
   * the name of the input field (only set if inside type: object)
   */
  @Input() name: string;

  /**
   * the label of the input field
   */
  @Input() label: string;

  /**
   * the input value
   */
  @Input() value: any;

  /**
   * root form value (can be used in custom components)
   */
  @Input() rootValue: any;

  /**
   * emit changes done by the user in the component
   */
  @Output() valueChange: EventEmitter<any> = new EventEmitter();

  /**
   * emit whether this part of the form is valid
   */
  @Output() errorChange: EventEmitter<string> = new EventEmitter();

  /**
   * indicate schema changes done via the layout editor
   */
  @Output() schemaChange: EventEmitter<void> = new EventEmitter();

  /**
   * JSON schema to use
   */
  @Input() schema: Schema;

  /**
   * parent schema to edit required
   */
  @Input() parentSchema: Schema;

  /**
   * form editor
   */
  edit: any;

  /**
   * root JSON schema to use when looking up $ref (simply passed along the tree)
   */
  @Input() rootSchema: Schema;

  /**
   * base URL for resolving $ref
   */
  @Input() base: string;

  /**
   * indicates whether this is the root of the component tree
   */
  isRoot = false;

  /**
   * if present: value of the switch property that determines whether this component renders itself
   * (schema.case not present or schema.case === switch)
   */
  @Input() switch: string;

  /**
   * indicates to child components whether the parent object has hideUndefined set (i.e. do not render yourself
   * if your value is undefined)
   */
  @Input() hideUndefined: boolean;

  /**
   * are we already in the expansion panel?
   */
  @Input() inExpansion: boolean;

  /**
   * are we already in an array?
   */
  @Input() inArray: boolean;

  /**
   * required imported from parent
   */
  @Input() required: boolean;

  /**
   * hook for custom widgets
   */
  @ViewChild(WidgetDirective, { static: true }) widgetHost: WidgetDirective;

  /**
   * order field transforms properties into this structure.
   * allows omission, ordering and hierarchy
   */
  orderedProperties: { [key: string]: Schema }[];

  /**
   * avoids change detection issues for arrays
   */
  arrayIndices: number[] = [];

  /**
   * avoids change detection issues for arrays
   */
  additionalPropNames: string[] = [];

  /**
   * make sure to return the same date object instance (cannot delete date #83)
   */
  date: Date;

  /**
   * choices that might be loaded async, initialized with current value and its potentially delayed toString value
   */
  choices: ReplaySubject<any>;

  /**
   * autocomplete filtered choices
   */
  filteredOptions: Observable<any>;

  /**
   * autocomplete form control for simpler change detection
   */
  control: FormControl;

  /**
   * implementation specified in displayWith
   */
  ch: any;

  /**
   * complete chip entry with enter or comma
   */
  readonly separatorKeysCodes: number[] = [ENTER, COMMA, TAB];

  /**
   * readOnly if schema.readOnly or schema.createOnly and value set
   */
  readOnly: boolean;

  /**
   * error from a custom component
   */
  customError: string;

  /**
   * apply order, called anytime properties are set
   */
  setOrderedProperties() {
    if (this.schema.order) {
      this.orderedProperties = [];
      for (const p of this.schema.order) {
        const arr = Array.isArray(p) ? p : [p];
        const o = {};
        for (const q of arr) {
          o[q] = this.schema.properties[q];
        }
        this.orderedProperties.push(o);
      }
    } else if (this.schema.properties) {
      this.orderedProperties = [];
      for (const [key, value] of Object.entries(this.schema.properties)) {
        const o = {};
        o[key] = value;
        this.orderedProperties.push(o);
      }
    }
  }

  /**
   * initialize the comonent.
   * replace undefined with null and init autocomplete choices
   */
  ngOnInit(): void {
    if (!this.schema) {
      this.schema = { type: 'string' };
    }

    this.readOnly = this.schema.readOnly || (this.schema.createOnly && this.value);

    if (!this.rootSchema) {
      this.rootSchema = this.schema;
      this.rootValue = this.value;
      this.isRoot = true;
    }

    this.setOrderedProperties();


    if (typeof this.value === 'undefined') {
      if (this.schema.default) {
        this.value = this.schema.default;
        setTimeout(() => this.emit(this.value), 500);
      } else {
        if (!this.hideUndefined) {
          this.value = null;
        }
      }
    }

    if (this.getLayout() === 'custom') {
      this.loadComponent();
    }

    if (this.isRoot) {
      setTimeout(() => {
        this.errorChange.emit(this.recursiveError());
      }, 10);
    }

    this.ch = this.service.displayWithRegistry[this.schema.displayWith];
    if (!this.ch) {
      this.ch = new DefaultChoiceHandler();
    }
    this.control = new FormControl(this.value);
    this.choices = new ReplaySubject();
    if (Array.isArray(this.value)) {
      const arr = [];
      for (const i of this.value) {
        arr.push({ name: i, value: i });
      }
      this.choices.next(arr);
    } else {
      this.choices.next([{ name: this.value, value: this.value }]);
    }
    if (this.value || this.value === 0) {
      if (Array.isArray(this.value)) {
        this.arrayIndices = Array.from(Array(this.value.length).keys());
        const arr: Observable<any>[] = [];
        for (const i of this.value) {
          arr.push(this.ch.choice(i, this.schema));
        }
        forkJoin(arr).subscribe(res => this.choices.next(res));
      } else {
        this.ch.choice(this.value, this.schema).subscribe(res => this.choices.next([res]));
      }
    }
    this.filteredOptions = this.control.valueChanges
      .pipe(
        startWith(this.value),
        debounceTime(this.ch.debounceTime()),
        switchMap(x => {
          this.change({ target: { value: x } });
          return this.ch.filter(this.value, this.schema, x, this.choices);
        })
      );

    if (this.schema.choicesLoad === 'onLoad') {
      this.focus();
    }

    if (this.schema.additionalProperties && this.value) {
      this.additionalPropNames = Object.keys(this.value);
      this.arrayIndices = Array.from(Array(this.additionalPropNames.length).keys());
    }

  }

  /**
   * choice element activated - load values
   */
  focus() {
    //todo..
  }

  /**
   * emit valueChange event and also any validation error
   */
  emit(event: any) {
    this.valueChange.emit(event);
    if (this.isRoot) {
      setTimeout(() => {
        this.errorChange.emit(this.recursiveError());
      }, 10);
    }
  }

  /**
   * if the schema changes from the outside,
   * reset the component state wrt. errors and the choices cache
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value && !changes.value.isFirstChange() && this.getLayout() === 'autocomplete') {
      // make sure autocomplete form control picks up external changes
      this.control.setValue(changes.value.currentValue);
    }

    if (changes.schema) {
      if (changes.schema.previousValue) {
        this.rootSchema = null;
        if (this.widgetHost.viewContainerRef) {
          this.widgetHost.viewContainerRef.clear();
        }
        this.ngOnInit();
      }
    }

    if (changes.switch && !changes.switch.isFirstChange()) {
      if (this.getLayout() === 'custom') {
        this.loadComponent();
      } else {
        if (this.widgetHost.viewContainerRef) {
          this.widgetHost.viewContainerRef.clear();
        }
      }
    }
  }

  /**
   * angular pipe sorting function for keyValue - keep the JSON order and do not
   * order alphabetically
   */
  originalOrder = (a: KeyValue<string, Schema>, b: KeyValue<string, Schema>): number => {
    return 0;
  }

  /**
   * key method to instruct the display which HTML block to activate.
   */
  getLayout(): string {
    if (this.schema.case && this.schema.case.indexOf(this.switch) < 0) {
      return 'none';
    }
    if (this.schema.widget === 'custom') {
      return 'custom';
    }
    if (this.hideUndefined && this.value === undefined) {
      return 'none';
    }

    if (this.schema.type === 'object') {

      return 'object';
    }
    if (this.schema.type === 'array') {
      if (this.schema.layout === 'tab') {
        return 'tab';
      }
      if (this.schema.layout === 'table') {
        return 'table';
      }
      if (this.schema.layout === 'select') {
        return 'array-select';
      }
      if (this.schema.layout === 'chips') {
        return 'chips';
      }
      return 'array';
    }
    if (this.schema.enum) {
      return 'enum';
    }
    if (this.schema.widget === 'date') {
      return 'date';
    }
    if (this.schema.widget === 'textarea') {
      return 'textarea';
    }
    if (this.schema.type === 'boolean') {
      return 'checkbox';
    }

    return 'single';
  }

  /**
   * called from template in the "simple" type. If "type" is "number" or "integer",
   * the HTML input type is "number" which avoids normal string input
   */
  getInputType(schema: Schema): string {
    if (schema.type === 'number') {
      return 'number';
    }
    if (schema.type === 'integer') {
      return 'number';
    }
    return schema.widget;
  }

  /**
   * called from template in the "simple" type. Step will defaults to `any`
   * otherwise it will use the configured value in the schema.
   * Allows fine control over validation and increment/decrement of the input
   * 
   * @param schema JSON schema object describing the property
   * 
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-step
   */
  getStepValue(schema: Schema): string {
    return schema.multipleOf ? '' + schema.multipleOf : "any";
  }

  /**
   * event handler for object display. Catches the child component event and
   * handle it by setting the value[key].
   * Also init null objects with {}
   */
  onValueChange(key: string, value: any) {
    if (!this.value || typeof (this.value) !== 'object') {
      this.value = {};
    }
    this.value[key] = value;
    this.emit(this.value);
  }
  /**
   * returns the validation error on this level and call recursively for all children.
   * returns null if the form contents is valid
   */
  recursiveError(): string {
    const e = this.error();
    if (e) {
      return e;
    }
    if (this.child) {
      return this.child.recursiveError();
    }
    if (this.children) {
      for (const c of this.children) {
        const r = c.recursiveError();
        if (r) {
          return r;
        }
      }
    }
    return null;
  }

  /**
   * return the error message provided in the schema or the generic error message
   * returned from the validation code
   */
  e(error: string): string {
    if (this.schema.errorMessage) {
      return this.schema.errorMessage;
    }
    return error;
  }

  /**
   * return error string
   */
  error(): string {

    if (this.schema.widget === 'custom') {
      return this.customError;
    }
    if (this.schema.case && this.schema.case.indexOf(this.switch) < 0) {
      return null;
    }
    if (this.value || this.value === 0) {
      if (this.schema.maxItems || this.schema.maxItems === 0) {
        if (!(this.value.length <= this.schema.maxItems)) {
          return this.e('Only ' + this.schema.maxItems + ' array entries allowed');
        }
      }
      if (this.schema.uniqueItems) {
        if (!(new Set(this.value).size === this.value.length)) {
          return this.e('Array entries must be unique');
        }
      }
      if (this.schema.minItems || this.schema.minItems === 0) {
        if (!(this.value.length >= this.schema.minItems)) {
          return this.e('At least ' + this.schema.minItems + ' array entries required');
        }
      }
      if (this.schema.maxProperties || this.schema.maxProperties === 0) {
        if (!(Object.keys(this.value).length <= this.schema.maxProperties)) {
          return this.e('Only ' + this.schema.maxProperties + ' fields allowed');
        }
      }
      if (this.schema.propertyNames) {
        for (const key of Object.keys(this.value)) {
          const re = new RegExp(this.schema.propertyNames);
          if (!re.test(key)) {
            return this.e('illegal field name: ' + key);
          }
        }
      }
      if (this.schema.dependencies) {
        for (const dep of Object.keys(this.schema.dependencies)) {
          if (this.value[dep]) {
            for (const l of this.schema.dependencies[dep]) {
              if (!this.value[l]) {
                return this.e(dep + ' depends on ' + l);
              }
            }
          }
        }
      }
      if (this.schema.minProperties || this.schema.minProperties === 0) {
        if (!(Object.keys(this.value).length >= this.schema.minProperties)) {
          return this.e('At least ' + this.schema.minProperties + ' fields required');
        }
      }
      if (this.schema.maxLength || this.schema.maxLength === 0) {
        if (!(('' + this.value).length <= this.schema.maxLength)) {
          return this.e('Input is longer than ' + this.schema.maxLength);
        }
      }
      if (this.schema.minLength || this.schema.minLength === 0) {
        if (!(('' + this.value).length >= this.schema.minLength)) {
          return this.e('Input is shorter than ' + this.schema.minLength);
        }
      }
      if (this.schema.multipleOf || this.schema.multipleOf === 0) {
        if (!Number.isInteger(Number(this.value) / this.schema.multipleOf)) {
          return this.e('Must be multiple of ' + this.schema.multipleOf);
        }
      }
      if (this.schema.exclusiveMaximum || this.schema.exclusiveMaximum === 0) {
        if (!(Number(this.value) < this.schema.exclusiveMaximum)) {
          return this.e('Must be less than ' + this.schema.exclusiveMaximum);
        }
      }
      if (this.schema.maximum || this.schema.maximum === 0) {
        if (!(Number(this.value) <= this.schema.maximum)) {
          return this.e('Must be less than or equal ' + this.schema.maximum);
        }
      }
      if (this.schema.exclusiveMinimum || this.schema.exclusiveMinimum === 0) {
        if (!(Number(this.value) > this.schema.exclusiveMinimum)) {
          return this.e('Must greater than ' + this.schema.exclusiveMinimum);
        }
      }
      if (this.schema.minimum || this.schema.minimum === 0) {
        if (!(Number(this.value) >= this.schema.minimum)) {
          return this.e('Must greater than or equal ' + this.schema.minimum);
        }
      }
    }
    if (this.required) {
      if (this.value == null || Object.is(this.value, NaN)) {
        return this.e('required');
      }
    }
    if (this.schema.required) {
      for (const dep of this.schema.required) {
        if (!this.value[dep] && this.value[dep] !== false && this.value[dep] !== 0) {
          // ignore 'required' if dep is inactive due to switch / case
          let inactive = false;
          if (this.schema.switch) {
            const switc = this.value[this.schema.switch];
            if (switc && this.schema.properties[dep].case?.indexOf(switc) < 0) {
              inactive = true;
            }
          }
          if (!inactive) { return this.e(dep + ' is required'); }
        }
      }
    }
    if (this.schema.pattern) {
      const re = new RegExp(this.schema.pattern);
      if (this.value && !re.test(this.value)) {
        return this.e('illegal string');
      }
    }
    if (this.schema.format && this.service.formats[this.schema.format]) {
      const re = new RegExp(this.service.formats[this.schema.format]);
      if (this.value && !re.test(this.value)) {
        return this.e('illegal string');
      }
    }
    return null;
  }

  /**
   * use the element title if present, defaults to the label input or "" is both are null
   */
  getLabel(): string {
    if (this.schema.title) {
      return this.schema.title;
    }
    if (this.label) {
      return this.label;
    }
    return '';
  }

  /**
   * input element change handler.
   * normalize the different kind of events, handle the datatypes, set the value and emit the change
   */
  change(event: any) {

    let eventTarget: any;

    if (event instanceof MatSelectChange) {
      event = event.value;
    } else if (event instanceof MatDatepickerInputEvent) {
      event = this.serializeDate(event.value, this.schema.dateFormat, this.schema.type);
    } else if (event instanceof MatAutocompleteSelectedEvent) {
      event = event.option.value;
    } else if (event instanceof MatCheckboxChange) {
      event = event.checked;
    } else {
      // save the event target in case the parsing changes the value
      // (e.g. integer input 5.3 becomes 5, this is reflected on the UI via this handle)
      eventTarget = event.target;
      event = event.target.value;
    }

    if (event === '') {
      event = null;
    }

    if (event == null) {
      this.value = null;
    }

    if (this.schema.type === 'number') {
      this.value = isNaN(parseFloat(event)) ? event : parseFloat(event);
    } else if (this.schema.type === 'integer') {
      this.value = isNaN(parseInt(event)) ? event : parseInt(event, 10);
    } else if (this.schema.type === 'boolean') {
      if (typeof event === 'string') {
        if (event === 'true') {
          this.value = true;
        } else if (event === 'false') {
          this.value = false;
        } else {
          this.value = null;
        }
      } else {
        this.value = event;
      }
    } else if (this.schema.type === 'string') {
      this.value = event;
    } else if (this.schema.type === 'array') {
      this.value = event;
    } else {
      throw new Error('unknown type: ' + this.schema.type);
    }

    this.emit(this.value);
  }

  /**
   * allows for the result of a file upload to be written into a text form element
   */
  handleFileInput(base64: boolean, event: any) {
    if (10 * 1024 * 1024 <= event.target.files.item(0).size) {
      console.log('The file size is limited to 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.value = reader.result;

      if (this.schema.type === 'object' || this.schema.type === 'array') {
        this.value = JSON.parse(this.value);
      }

      this.emit(this.value);
    };
    if (base64) {
      reader.readAsDataURL(event.target.files.item(0));
    } else {
      reader.readAsText(event.target.files.item(0));
    }
  }

  /**
   * load the dynamic custom widget
   */
  loadComponent() {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(this.service.registry[this.schema.widgetType]);
    const viewContainerRef = this.widgetHost.viewContainerRef;
    viewContainerRef.clear();
    const componentRef = viewContainerRef.createComponent(componentFactory);

    // input values
    (componentRef.instance as WidgetComponent).label = this.label;
    (componentRef.instance as WidgetComponent).value = this.value;
    (componentRef.instance as WidgetComponent).schema = this.schema;
    (componentRef.instance as WidgetComponent).rootSchema = this.rootSchema;
    (componentRef.instance as WidgetComponent).rootValue = this.rootValue;

    // subscribe to value changes and forward them
    (componentRef.instance as WidgetComponent).valueChange.subscribe(data => {
      this.value = data;
      this.emit(this.value);
    });

    // subscribe to error changes and forward them
    (componentRef.instance as WidgetComponent).errorChange.subscribe(error => {
      this.customError = error;
      this.errorChange.emit(error);
    });
  }

  /**
   * used for expansion panels - set value and forward event
   */
  setAndEmit(event: any) {
    this.value = event;
    this.emit(this.value);
  }

  /**
   * set an array element and emit value change event
   */
  setIndexAndEmit(i: number, event: any) {
    this.value[i] = event;
    this.emit(this.value);
  }

  /**
   * set an array element's field and emit value change event (applies to table layout)
   */
  setIndexAndEmitTable(i: number, field: string, event: any) {
    this.value[i][field] = event;
    this.emit(this.value);
  }

  /**
   * used when hideUndefined is active. Called from the UI to
   * show a property with undefined value (in order to be able to set if in the form)
   */
  showProperty(prop: string) {
    if (!this.value) {
      this.value = {};
    }
    if (this.value[prop] === undefined) {
      this.value[prop] = null;
    } else if (this.value[prop] === null) {
      this.value[prop] = undefined;
    }
  }

  /**
   * used when hideUndefined is active. Called from the UI
   * to determine which properties are included in the "to add" list
   */
  showPropertyList(): string[] {
    if (this.schema.switch && this.value) {
      const sw = this.value[this.schema.switch];
      const props = [];
      for (const [k, v] of Object.entries(this.schema.properties)) {
        if (v.case) {
          if (v.case.includes(sw)) {
            props.push(k);
          }
        } else {
          props.push(k);
        }
      }
      return props.sort();
    } else {
      return Object.keys(this.schema.properties).sort();
    }
  }

  /**
   * string to date
   * @param date    date string / number (millisecs since 1970)
   * @param format  date format
   */
  parseDate(date: any, format: string): Date {
    if (!date && date !== 0) {
      return date;
    }
    if (typeof date === 'number') {
      return this.sameDate(new Date(date));
    }
    if (!format) {
      return date;
    }
    const pdate = date.split(this.getDelimiter(format));
    const pformat = format.split(this.getDelimiter(format));
    return this.sameDate(new Date(pdate[pformat.indexOf('yyyy')], pdate[pformat.indexOf('MM')] - 1, pdate[pformat.indexOf('dd')]));
  }

  /**
   * make sure to return the same date object instance (cannot delete date #83)
   */
  sameDate(nd: Date): Date {
    if (!this.date) {
      this.date = nd;
    }
    if (this.date.getTime() !== nd.getTime()) {
      this.date = nd;
    }
    return this.date;
  }

  /**
   * date to string
   * @param date    the date to serialize
   * @param format  the date format (e.g. dd-MM-yyyy)
   * @param type    target datatype (allows serializing to millisecs since 1970)
   */
  serializeDate(date: Date, format: string, type: string): string {
    if (date == null) {
      return '';
    }
    if (type === 'integer' || type === 'number') {
      return '' + date.valueOf();
    }
    if (!format) {
      return date.toISOString();
    }
    const pformat = format.split(this.getDelimiter(format));
    const pdate = [null, null, null];
    pdate[pformat.indexOf('yyyy')] = date.getFullYear();
    pdate[pformat.indexOf('MM')] = date.getMonth() + 1;
    pdate[pformat.indexOf('dd')] = date.getDate();
    return pdate[0] + this.getDelimiter(format) + pdate[1] + this.getDelimiter(format) + pdate[2];
  }

  /**
   * find the first non letter character in a date format such as dd/MM/yyyy (returns /)
   */
  getDelimiter(format: string): string {
    const delim = format.match(/\W/g);
    if (!delim[0]) {
      throw new Error('No delimiter found in date format: ' + format);
    }
    return delim[0];
  }

  /**
   * new chip entered
   */
  addChip(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      if (!this.value) { this.value = []; }
      this.value.push(value.trim());
      this.emit(this.value);
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  /**
   * remove a chip
   */
  removeChip(v: string): void {
    const index = this.value.indexOf(v);
    if (index >= 0) {
      this.value.splice(index, 1);
      if (this.value.length === 0) { this.value = null; }
      this.emit(this.value);
    }
  }

  /**
   * chips d&d handler
   */
  dropChip(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.value, event.previousIndex, event.currentIndex);
    this.emit(this.value);
  }
}
