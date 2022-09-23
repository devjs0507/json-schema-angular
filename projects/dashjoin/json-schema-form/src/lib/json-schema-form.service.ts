import { Injectable, Type } from '@angular/core';


/**
 * service for registering custom components
 */
@Injectable({
  providedIn: 'root'
})
export class JsonSchemaFormService {

  /**
   * layout editor mode
   */
  public editMode = false;

  /**
   * built-in formats
   */
  formats = {
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    ipv4: /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    uri: /^\w+:(\/?\/?)[^\s]+$/
  };

  /**
   * registry of custom widgets. The keys are the values used in schema.widgetType, the values
   * are the Type<any> of the custom widget component implementing WidgetComponent
   */
  registry = {};

  /**
   * context data accessible from JSONata expressions
   */
  context = {};

  /**
   * registry of displayWith objects
   */
  displayWithRegistry: { [key: string]: any } = {};

  /**
   * register custom component
   * @param key     the name of the component which is used in schema extension: widget=custom, widgetType=key
   * @param value   the implementation class
   */
  registerComponent(key: string, value: Type<any>) {
    this.registry[key] = value;
  }

  /**
   * register displayWith implementations
   * @param key     the name of the implementation which is used in schema extension: displayWith=key
   * @param value   the implementation class
   */
  registerDisplayWith(key: string, value: any) {
    this.displayWithRegistry[key] = value;
  }

  /**
   * set a context key
   */
  setContext(key: string, value: any) {
    this.context[key] = value;
  }
}
