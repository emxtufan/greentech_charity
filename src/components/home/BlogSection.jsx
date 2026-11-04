import Reveal from '../common/Reveal'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  EditableText,
  ListItem,
  useField,
} from '../editable'

export const defaultData = {
  subtitle: 'News Update',
  title: 'Latest News & Articles',
  items: [
    {
      id: 1,
      image: 'blog_img_01.jpg',
      tag: 'Charity',
      author: 'M Riad',
      date: '25 Nov 2025',
      title: { label: 'Behind the Scenes: How Your Donations Are Used', to: '/#blog' },
      comments: '08 Comment',
      cta: { label: 'Details More', to: '/#blog' },
    },
    {
      id: 2,
      image: 'blog_img_02.jpg',
      tag: 'Charity',
      author: 'M Riad',
      date: '25 Nov 2025',
      title: { label: 'Behind the Scenes: Where Your Donations Go', to: '/#blog' },
      comments: '08 Comment',
      cta: { label: 'Details More', to: '/#blog' },
    },
    {
      id: 3,
      image: 'blog_img_03.jpg',
      tag: 'Charity',
      author: 'M Riad',
      date: '25 Nov 2025',
      title: { label: 'Behind the Scenes: How Your Gifts Are Used', to: '/#blog' },
      comments: '08 Comment',
      cta: { label: 'Details More', to: '/#blog' },
    },
    {
      id: 4,
      image: 'blog_img_04.jpg',
      tag: 'Charity',
      author: 'M Riad',
      date: '25 Nov 2025',
      title: { label: 'Behind the Scenes: How Your Support Is Used', to: '/#blog' },
      comments: '08 Comment',
      cta: { label: 'Details More', to: '/#blog' },
    },
  ],
}

export default function BlogSection() {
  const { value: items = [] } = useField('items')

  return (
    <div id="blog" className="blog-section-one pt-130 lg-pt-80 pb-170 lg-pb-80">
      <div className="container">
        <Reveal className="title-one text-center mb-30 lg-mb-10" anim="slide-up" duration={900}>
          <EditableText field="subtitle" as="div" className="upper-title" />
          <EditableText field="title" as="h2" />
        </Reveal>
        {/* /.title-one */}
      </div>

      <div className="box-layout-two">
        <div className="row">
          {items.map((post, index) => (
            <ListItem key={post.id} field="items" index={index}>
              <Reveal
                className="col-xl-3 col-md-6"
                anim="slide-up"
                duration={900}
                delay={index * 100}
              >
                <article className="blog-meta-one mt-30">
                  <div className="post-info">
                    <ul className="style-none post-author d-flex justify-content-center flex-wrap">
                      <li>
                        <EditableText field="tag" as="span" />
                      </li>
                      <li>
                        <i className="fa-regular fa-user"></i>{' '}
                        <EditableText field="author" as="span" />
                      </li>
                      <li>
                        <i className="fa-regular fa-calendar"></i>{' '}
                        <EditableText field="date" as="span" />
                      </li>
                    </ul>
                  </div>
                  <EditableImage field="image" asBackground className="img-meta" />
                  <div className="post-meta">
                    <h4 className="blog-title">
                      <EditableLink field="title" className="line-bg" />
                    </h4>
                    <ul className="style-none bottom-widget d-flex flex-wrap">
                      <li>
                        <EditableLink field="cta" className="details-cta tran3s" />
                      </li>
                      <li>
                        <i className="fa-regular fa-comment"></i>{' '}
                        <EditableText field="comments" as="span" className="comment" />
                      </li>
                    </ul>
                  </div>
                  {/* /.post-meta */}
                </article>
                {/* /.blog-meta-one */}
              </Reveal>
            </ListItem>
          ))}
        </div>
        <AddItemButton field="items" bulkImageField="image" />
      </div>
    </div>
  )
}
