import { Component, OnInit } from '@angular/core';
import { CustomComponent } from './custom.component';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DefaultChoiceHandler, JsonSchemaFormService, Schema } from 'projects/dashjoin/json-schema-form/src/public-api';

/**
 * router component
 */
@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
}

/**
 * JSON schema form demo
 */
@Component({
  templateUrl: './app.component.html',
  styles: ['textarea {font-family: monospace; height: 300px}', 'td {border-bottom: 1px solid #ddd;}']
})
export class MainComponent implements OnInit {

  /**
   * need to access custom component registry
   * @param service   service for registering custom widgets etc.
   * @param route     allows selecting an example via URL
   */
  constructor(public service: JsonSchemaFormService, private route: ActivatedRoute) { }

  /**
   * example schema for meta schema case - also used in schema editor component
   */
  static schemaExample = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Enter your name'
      },
      age: {
        type: 'number',
        title: 'Your age',
      },
      emails: {
        type: 'array',
        items: {
          type: 'string', format: 'email'
        }
      }
    }
  };

  /**
   * meta schema for meta schema case - also used in schema editor component
   */
  static metaschema: Schema = {
    $schema: 'https://json-schema.org/draft-06/schema#',
    $ref: '#/definitions/prop',
    definitions: {
      prop: {
        type: 'object',
        hideUndefined: true,
        switch: 'type',
        class: [
          'mat-elevation-z4'
        ],
        style: {
          'font-size': 'small'
        },
        properties: {
          type: { type: 'string', enum: ['string', 'number', 'array', 'object'] },
          enum: { type: 'array', items: { type: 'string' }, case: ['string'] },
          multipleOf: { type: 'number', case: ['number'] },
          maximum: { type: 'number', case: ['number'] },
          exclusiveMaximum: { type: 'number', case: ['number'] },
          minimum: { type: 'number', case: ['number'] },
          exclusiveMinimum: { type: 'number', case: ['number'] },
          maxLength: { type: 'number', case: ['string'] },
          minLength: { type: 'number', case: ['string'] },
          pattern: { type: 'string', case: ['string'] },
          maxItems: { type: 'number', case: ['array'] },
          minItems: { type: 'number', case: ['array'] },
          uniqueItems: { type: 'boolean', case: ['array'] },
          maxProperties: { type: 'number', case: ['object'] },
          minProperties: { type: 'number', case: ['object'] },
          additionalProperties: { $ref: '#/definitions/prop' },
          required: { type: 'array', case: ['object'], items: { type: 'string' } },
          propertyNames: { type: 'string', case: ['object'] },
          title: { type: 'string' },
          description: { type: 'string' },
          default: { type: 'string' },
          examples: { type: 'array', items: { type: 'string' }, case: ['string'] },
          readOnly: { type: 'boolean', case: ['string', 'number', 'array'] },
          format: { type: 'string', case: ['string'], enum: [null, 'email', 'ipv4', 'url', 'uri'] },
          items: {
            $ref: '#/definitions/propNoRec'
          },
          properties: {
            case: ['object'],
            type: 'object',
            layout: 'vertical',
            additionalProperties: { $ref: '#/definitions/prop' }
          }
        }
      },
      propNoRec: {
        case: ['array'],

        type: 'object',
        hideUndefined: true,
        switch: 'type',
        class: [
          'mat-elevation-z4'
        ],
        style: {
          'font-size': 'small'
        },
        properties: {
          type: { type: 'string', enum: ['string', 'number', 'array', 'object'] },
          enum: { type: 'array', items: { type: 'string' }, case: ['string'] },
          multipleOf: { type: 'number', case: ['number'] },
          maximum: { type: 'number', case: ['number'] },
          exclusiveMaximum: { type: 'number', case: ['number'] },
          minimum: { type: 'number', case: ['number'] },
          exclusiveMinimum: { type: 'number', case: ['number'] },
          maxLength: { type: 'number', case: ['string'] },
          minLength: { type: 'number', case: ['string'] },
          pattern: { type: 'string', case: ['string'] },
          maxItems: { type: 'number', case: ['array'] },
          minItems: { type: 'number', case: ['array'] },
          uniqueItems: { type: 'boolean', case: ['array'] },
          maxProperties: { type: 'number', case: ['object'] },
          minProperties: { type: 'number', case: ['object'] },
          additionalProperties: { $ref: '#/definitions/prop' },
          required: { type: 'array', case: ['object'], items: { type: 'string' } },
          propertyNames: { type: 'string', case: ['object'] },
          title: { type: 'string' },
          description: { type: 'string' },
          default: { type: 'string' },
          examples: { type: 'array', items: { type: 'string' }, case: ['string'] },
          readOnly: { type: 'boolean', case: ['string', 'number', 'array'] },
          format: { type: 'string', case: ['string'], enum: [null, 'email', 'ipv4', 'url', 'uri'] },
          properties: {
            case: ['object'],
            type: 'object',
            layout: 'vertical',
            additionalProperties: { $ref: '#/definitions/prop' }
          }
        }
      },
    }
  };

  /**
   * schema bound to component
   * <ca-json-schema-form [(value)]="value" [schema]="schema" (errorChange)="error=$event"></ca-json-schema-form>
   */
  schema: Schema = { type: 'string' };

  /**
   * value bound to component
   * <ca-json-schema-form [(value)]="value" [schema]="schema" (errorChange)="error=$event"></ca-json-schema-form>
   */
  value: any = 'test';

  /**
   * value bound to component
   * <ca-json-schema-form [(value)]="value" [schema]="schema" (errorChange)="error=$event"></ca-json-schema-form>
   */
  error: string;

  /**
   * desc of the example
   */
  description = 'The simplest JSON schema form. Try clicking on the buttons to get to more complex examples.';

  /**
   * examples
   */
  examples: { [key: string]: { description: string, value: any, schema: Schema } } =
    {
      complex: {
        description: 'A complex example combining multiple features',
        value: {
          name: 'joe',
          country: 'United States',
          email: ['joe@example.org', 'alt@example.org'],
          birthday: '2000-03-22T23:00:00.000Z',
          consent: 'yes'
        },
        schema: {
          type: 'object',
          title: 'Person',
          properties: {
            name: { type: 'string' },
            country: {
              description: 'Options loaded via REST',
              type: 'string',
              widget: 'select',
              choicesUrl: '/assets/autocomplete-simple.json',
              choicesVerb: 'GET'
            },
            password: {
              type: 'string',
              widget: 'password'
            },
            birthday: {
              type: 'string',
              widget: 'date'
            },
            email: {
              type: 'array',
              layout: 'vertical',
              items: { type: 'string', format: 'email', errorMessage: 'Please enter a valid email' }
            },
            consent: {
              title: 'I consent',
              description: 'This is a required field',
              type: 'string',
              enum: [null, 'yes', 'no']
            },
          }
        }
      },
      test: {
        description: 'This schema allows editing JSON schema itself. Note that not all JSON schema features are supported.',
        value: {},
        schema: {
          "$schema": "https://json-schema.org/draft/2019-09/schema#",
          "$id": "https://diamondca.dbipp.db.com/schema/golden-copy/NAME_CHANGE-0.2.0",
          type: "object",
          layout: 'horizontal',
          "properties": {
            "oldSecurityName": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "description": "the current name of the security",
              "type": "string",
              "properties": {
                "value": {
                  "type": "string",
                  "minLength": 1
                }
              }
            },
            "newSecurityName": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "description": "the new name of the security",
              "properties": {
                "value": {
                  "type": "string",
                  "minLength": 1
                }
              }
            },
            "Ex-Tag": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "properties": {
                "value": {
                  "type": "string",
                  "format": "date"
                }
              }
            },
            "positionsDate": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "properties": {
                "value": {
                  "type": "string",
                  "format": "date"
                }
              }
            },
            "deletionDate": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "properties": {
                "value": {
                  "type": "string",
                  "format": "date"
                }
              }
            },
            "COAF": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "properties": {
                "value": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 16
                }
              }
            },
            "inhouseAndStarPartnerSecurity": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "properties": {
                "value": {
                  "type": "string"
                }
              }
            },
            "wmMessageStatus": {
              "allOf": [{ "$ref": "/schema/Value-0.1.0" }],
              "description": "WM Message Cancellation Flag",
              "properties": {
                "value": {
                  "type": "string",
                  "minLength": 1
                }
              }
            }
          },
          "required": [
            "oldSecurityName",
            "newSecurityName",
            "Ex-Tag",
            "positionsDate",
            "deletionDate",
            "COAF",
            "inhouseAndStarPartnerSecurity"
          ]
        }
      }
    };

  /**
   * error string in case the user enters invalid JSON in the schema text area
   */
  errorS: any;

  /**
   * error string in case the user enters invalid JSON in the value text area
   */
  errorV: any;

  /**
   * register custom demo comp
   */
  ngOnInit() {
    this.service.registerComponent('rich-text-editor', CustomComponent);
    this.service.registerDisplayWith('states', new MyDisplayer());
    this.service.registerDisplayWith('typeAhead', new MyTypeAhead());
    this.service.setContext('var', 'context passed from caller');
    this.route.params.subscribe(res => {
      // alert(JSON.stringify(res))
      if (res.id) {
        this.select(res.id);
      }
      this.select('test')
    });
  }

  /**
   * select one of the examples
   */
  select(key: string) {
    this.value = this.examples[key].value;
    this.schema = this.examples[key].schema;
    console.log(this.examples[key].schema)
    for (let schema in this.schema?.properties) {
      //widget
      this.examples[key].schema.properties[schema] = { ...this.examples[key].schema?.properties[schema], ...this.examples[key].schema?.properties[schema]?.properties?.value }
      this.examples[key].schema.properties[schema]['widget'] = <any>this.examples[key].schema.properties[schema].format
      delete this.examples[key].schema?.properties[schema]?.properties
      //console.log(schema + ": " + JSON.stringify(this.examples[key].schema?.properties[schema]))
    }
    this.description = this.examples[key].description;
    this.error = null;
  }

  /**
   * stringify JSON for display in the textarea
   */
  stringify(o: any): string {
    return JSON.stringify(o, null, 2);
  }

  /**
   * user made change in schema textarea:
   * set schema and handle parse error
   */
  changeS(event: any): void {
    try {
      this.schema = JSON.parse(event.target.value);
      this.errorS = null;
    } catch (e) {
      this.errorS = e;
    }
  }

  /**
   * user made change in value textarea:
   * set schema and handle parse error
   */
  changeV(event: any): void {
    try {
      this.value = JSON.parse(event.target.value);
      this.errorV = null;
    } catch (e) {
      this.errorV = e;
    }
  }

  /**
   * catch schema change event: make sure change detection picks up
   */
  schemaChange(): void {
    this.schema = JSON.parse(JSON.stringify(this.schema));
  }
}

/**
 * sample displayer implemetation
 */
export class MyDisplayer extends DefaultChoiceHandler {

  /**
   * hard coded state IDs
   */
  choice(value: any, schema: Schema): Observable<any> {
    if (value === 'CA') {
      return of({ value, name: 'California' });
    }
    if (value === 'OR') {
      return of({ value, name: 'Oregon' });
    }
    if (value === 'WA') {
      return of({ value, name: 'Washington' });
    }
    return of({ value, name: value });
  }
}

/**
 * sample typeahead implementation
 */
export class MyTypeAhead {

  /**
   * sample data
   */
  countries = [
    'China',
    'India',
    'United States',
    'Indonesia',
    'Brazil',
    'Pakistan',
    'Nigeria',
    'Bangladesh',
    'Russia',
    'Mexico',
    'Japan',
    'Philippines',
    'Egypt',
    'Ethiopia',
    'Vietnam',
    'DR Congo',
    'Iran',
    'Turkey',
    'Germany',
    'France'
  ];

  /**
   * initially, we do not load any choices
   */
  load(value: any, schema: Schema): Observable<any> {
    return of();
  }

  /**
   * called whenever the user types something
   */
  filter(value: any, schema: Schema, current: string, choices: Observable<any>): Observable<any> {
    // filter and convert to any
    const filtered = this.countries.filter(c => current ? ('' + c).toLowerCase().includes(('' + current).toLowerCase()) : true);

    // limit to 5 preview results
    while (filtered.length > 5) {
      filtered.pop();
    }

    const mapped: any = filtered.map(c => ({ name: c, value: c }));

    // return with a delay of 0.5 second to simulate an HTTP call
    console.log('requesting data for ' + current);
    return of(mapped).pipe(delay(500));
  }

  /**
   * initial value
   */
  choice(value: any, schema: Schema): Observable<any> {
    return of({ name: value, value });
  }

  /**
   * wait 0.2 second before making a new HTTP request
   */
  debounceTime() {
    return 200;
  }
}
