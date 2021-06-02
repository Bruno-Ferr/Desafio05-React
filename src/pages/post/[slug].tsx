import Head from 'next/head';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import Prismic from '@prismicio/client';
import Header from '../../components/Header';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import Comments from '../../components/Comments';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface Navigation {
  next_page: {
    uid: string;
    data: {
      title: string;
    }
  }[];
  prev_page: {
    uid: string;
    data: {
      title: string;
    }
  }[];
}

interface PostProps {
  post: Post;
  navigation: Navigation;
  preview: boolean;
}

export default function Post({ post, preview, navigation }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  const formattedDate = format(new Date(post.first_publication_date), 'dd MMM yyyy', {
    locale: ptBR,
  })

  const formattedEditedDate = format(new Date(post.last_publication_date), "dd MMM yyyy', às' kk:mm ", {
    locale: ptBR,
  })

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);
  
  const readTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Head>
        <title> {post.data.title}  | spacetraveling</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} alt="Banner" className={styles.banner}/>
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postTop}>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                {formattedDate}
              </li>
              <li>
                <FiUser />
                {post.data.author}
              </li>
              <li>
                <FiClock />
                {`${readTime} min`}
              </li>
            </ul>
            { post.first_publication_date != post.last_publication_date &&
              <p className={styles.postEditedAt}>* editado em {formattedEditedDate}</p>
            }
          </div>
          {post.data.content.map(content => {
            return (
              <div key={content.heading}>
                <article className={styles.navigation} >
                  <h3>{content.heading}</h3>
                  <div
                    className={styles.postContent}
                    dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body),}}
                  />
                </article>    
              </div>
            );
          })}  
          <div className={styles.neighbors} > 
            <div className={styles.prev}>    
              { navigation.prev_page.length > 0 &&
                <>
                  <p>{navigation.prev_page[0].data.title}</p>
                  <a href={`/post/${navigation.prev_page[0].uid}`}>Post anterior</a>
                </>
              }
            </div> 
            <div className={styles.next}>
              { navigation.next_page.length > 0 &&
                <>
                  <p>{navigation.next_page[0].data.title}</p>
                  <a href={`/post/${navigation.next_page[0].uid}`}>Próximo post</a>
                </>
              }
            </div>
          </div>
          <Comments />

          {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
        </div>   
      </main>
    </>
    
    
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    orderings: '[post.last_publication_date desc]',
    pageSize: 1,
  });

  const paths = posts.results.map(post => { 
    return {
      params: {
        slug: post.uid,
      }
    }
  });

  return {
    paths,
    fallback: true
  } 
};

export const getStaticProps: GetStaticProps = async ({ params, preview = false, previewData }) => {

  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevPost = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query([
      Prismic.predicates.at('document.type', 'post')
    ], {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: { 
      post,
      navigation: {
        next_page: nextPost?.results,
        prev_page: prevPost?.results,
      },
      preview,
    },
    revalidate: 60 * 30               // 30 min
  }
};
