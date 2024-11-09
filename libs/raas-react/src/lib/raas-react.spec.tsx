import { render } from '@testing-library/react';

import RaasReact from './raas-react';

describe('RaasReact', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<RaasReact />);
    expect(baseElement).toBeTruthy();
  });
});
