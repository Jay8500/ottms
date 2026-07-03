import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OttplatformsPage } from './ottplatforms.page';

describe('OttplatformsPage', () => {
  let component: OttplatformsPage;
  let fixture: ComponentFixture<OttplatformsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OttplatformsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
