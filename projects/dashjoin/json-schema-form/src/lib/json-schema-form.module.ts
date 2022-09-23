import { NgModule } from '@angular/core';
import { JsonSchemaFormComponent } from './json-schema-form.component';

import { MatCardModule } from '@angular/material/card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { WidgetDirective } from './widget.directive';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
@NgModule({
  declarations: [JsonSchemaFormComponent, WidgetDirective],
  imports: [
    MatCardModule,
    FlexLayoutModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    CommonModule,
    MatInputModule,
    MatNativeDateModule,
    MatButtonModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatChipsModule
  ],
  exports: [JsonSchemaFormComponent],
  providers: []

})
export class JsonSchemaFormModule { }
