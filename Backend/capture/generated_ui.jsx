Here is the converted JSX React component with styled-components, following best practices and responsiveness:
```
import React from 'react';
import { styled } from 'styled-components';

const Layout = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.header`
  background-color: #333;
  color: #fff;
  padding: 16px;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
`;

const Gallery = styled.div`
  overflow: hidden;
  width: 100%;
  height: calc(100vh - 50px - 100px);
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 16px;
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Footer = styled.footer`
  background-color: #333;
  color: #fff;
  padding: 16px;
  text-align: center;
  font-size: 14px;
  font-weight: normal;
`;

const App = () => {
  return (
    <Layout>
      <Header>
        <h1>{`Popular designs on Dribbble`}</h1>
      </Header>
      <Gallery>
        {/* Add your gallery items here, for demonstration purpose, just a placeholder */}
        {[...Array(20)].map((item, index) => <div key={index}>Gallery Item {index + 1}</div>)}
      </Gallery>
      <Footer>
        <p>&copy; 2023 Dribbble</p>
      </Footer>
    </Layout>
  );
};

export default App;
```
Here's a brief explanation of the code:

* `Layout` is the main container that takes up the full height and width of the viewport.
* `Header` is a basic header component with some basic styles and text alignment.
* `Gallery` is a container that holds the gallery items. We use CSS grid to make it responsive and adaptable to different screen sizes. Note that we calculate the height of the gallery based on the available height of the viewport, minus the header and footer heights.
* `Footer` is another basic footer component with some basic styles and text alignment.

In the `App` component, we simply render the `Layout` component with the `Header`, `Gallery`, and `Footer` components inside. For demonstration purposes, we add 20 placeholder gallery items, but you would replace this with your actual data.

This JSX code uses styled-components to define the styles for each component. We also use CSS media queries to make the gallery responsive and adapt to different screen sizes.