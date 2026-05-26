import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreategroupPage } from './creategroup.page';

describe('CreategroupPage', () => {
  let component: CreategroupPage;
  let fixture: ComponentFixture<CreategroupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreategroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
