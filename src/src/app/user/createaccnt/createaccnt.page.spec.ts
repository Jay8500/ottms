import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateaccntPage } from './createaccnt.page';

describe('CreateaccntPage', () => {
  let component: CreateaccntPage;
  let fixture: ComponentFixture<CreateaccntPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateaccntPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
